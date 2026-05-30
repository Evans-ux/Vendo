// lib/telegram/bot.ts
// Vee AI — Telegram bot
//
// KEY ARCHITECTURE:
//   GROQ_KEY     → vision ONLY (analyzeImage). Photo handler is self-contained.
//   GROQ_BACKUP  → chat primary + smart search query extraction (fast, sub-second)
//   OpenRouter   → chat fallback when GROQ_BACKUP is rate-limited
//   HuggingFace/Pollinations → image generation (/generate)

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
// @ts-ignore
import Groq from "groq-sdk";
import { HfInference } from "@huggingface/inference";
import OpenAI from "openai";

import {
  VEE_AI_SYSTEM_PROMPT,
  GROQ_VISION_PROMPT,
  IMAGE_GEN_ENHANCE_PROMPT,
  GROQ_QUERY_EXTRACT_PROMPT,
} from "./prompts";
import {
  searchProducts,
  searchProductsByParams,
  extractSearchParams,
  formatProductsForAI,
  getOrCreateUser,
  updateUserSizes,
  formatUserProfileForAI,
  getUserOrders,
  createOrder,
  generatePaymentLink,
  updateUserLocation,
} from "./services";

// ─── Keys ────────────────────────────────────────────────────────────────────

const TELEGRAM_TOKEN  = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const GROQ_VISION_KEY = (process.env.GROQ_API ?? process.env.GROQ_API_KEY ?? "").trim();
const GROQ_CHAT_KEY   = (process.env.GROQ_BACKUP ?? "").trim();
const HF_KEY          = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || "").trim();
const OPENROUTER_KEY  = (process.env.OPENROUTER_API_KEY || "").trim();

if (!TELEGRAM_TOKEN)  console.error("⚠️  Missing TELEGRAM_BOT_TOKEN");
if (!GROQ_CHAT_KEY)   console.warn("⚠️  Missing GROQ_BACKUP — chat will use OpenRouter only");
if (!GROQ_VISION_KEY) console.warn("⚠️  Missing GROQ_API — vision will be unavailable");

// ─── Conversation Memory ─────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string }
const conversations = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 8;

function getHistory(id: string): ChatMessage[] { return conversations.get(id) ?? []; }
function pushHistory(id: string, msg: ChatMessage) {
  const h = getHistory(id);
  h.push(msg);
  if (h.length > MAX_HISTORY) h.splice(0, h.length - MAX_HISTORY);
  conversations.set(id, h);
}

// ─── Checkout State ───────────────────────────────────────────────────────────

interface CheckoutState { productId: string; step: "phone" | "address" | "confirm"; phone?: string; address?: string }
const checkoutState = new Map<string, CheckoutState>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncate(text: string, max = 4000): string {
  return text.length <= max ? text : text.substring(0, max) + "\n\n… (truncated)";
}

function sanitizeAIResponse(reply: string | null | undefined): string {
  return (reply || "")
    .replace(/<\/?ASSISTANT>/gi, "")
    .replace(/<\|assistant\|>/gi, "")
    .replace(/\[ASSISTANT\]/gi, "")
    .replace(/<\/?assistant>/gi, "")
    .replace(/^\s*assistant\s*:/i, "")
    .trim();
}

function sanitizeMarkdown(text: string): string {
  return text
    .replace(/<\/?ASSISTANT>/gi, "")
    .replace(/<\|assistant\|>/gi, "")
    .replace(/\*\*/g, "*")
    .replace(/_/g, "\\_")
    .trim();
}

async function withTyping<T>(ctx: any, action: string, fn: () => Promise<T>): Promise<T> {
  await ctx.sendChatAction(action as any).catch(() => {});
  const iv = setInterval(() => ctx.sendChatAction(action as any).catch(() => {}), 4000);
  try { return await fn(); } finally { clearInterval(iv); }
}

// ─── Chat AI: GROQ_BACKUP primary → OpenRouter fallback ──────────────────────

async function chatWithAI(telegramId: string, userMessage: string, extraContext = ""): Promise<string> {
  const contextualMessage = extraContext ? `${userMessage}\n\n${extraContext}` : userMessage;
  pushHistory(telegramId, { role: "user", content: userMessage });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: VEE_AI_SYSTEM_PROMPT },
    ...getHistory(telegramId).slice(0, -1).slice(-8),
    { role: "user", content: contextualMessage },
  ];

  let reply = "";

  // ── Primary: GROQ_BACKUP (fast, sub-second) ───────────────────────────
  if (GROQ_CHAT_KEY) {
    try {
      // @ts-ignore
      const groq = new Groq({ apiKey: GROQ_CHAT_KEY });
      const res = await groq.chat.completions.create({
        model: "llama-3.1-8b-instant",
        messages,
        max_tokens: 512,
        temperature: 0.7,
      });
      reply = sanitizeAIResponse(res.choices[0]?.message?.content);
      if (reply) console.log(`[Groq Chat] ✅ ${reply.length} chars`);
      else throw new Error("Empty response");
    } catch (e: any) {
      console.warn(`[Groq Chat] Failed: ${e.message} — falling back to OpenRouter`);
    }
  }

  // ── Fallback: OpenRouter ──────────────────────────────────────────────
  if (!reply && OPENROUTER_KEY) {
    try {
      const or = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OPENROUTER_KEY,
        defaultHeaders: { "HTTP-Referer": "https://vendo.ng", "X-Title": "Vendo Vee AI" },
      });
      const res = await or.chat.completions.create({ model: "openrouter/auto", messages, max_tokens: 512 });
      reply = sanitizeAIResponse(res.choices[0]?.message?.content);
      if (reply) console.log(`[OpenRouter] ✅ ${reply.length} chars`);
    } catch (e: any) {
      console.error("[OpenRouter] Failed:", e.message);
    }
  }

  if (!reply) reply = "Sorry, I'm a bit busy right now — please try again in a moment! 🙏";
  pushHistory(telegramId, { role: "assistant", content: reply });
  return reply;
}

// ─── Smart Search: Groq extracts params → regex fallback ─────────────────────
// Uses GROQ_BACKUP key (chat key) so vision key is never touched here.

async function aiExtractSearchParams(userMessage: string): Promise<import("./services").SmartSearchParams | null> {
  if (!GROQ_CHAT_KEY) return null;
  try {
    // @ts-ignore
    const groq = new Groq({ apiKey: GROQ_CHAT_KEY });
    const res = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: GROQ_QUERY_EXTRACT_PROMPT },
        { role: "user", content: userMessage },
      ],
      max_tokens: 200,
      temperature: 0.1,
    });
    const raw = (res.choices[0]?.message?.content || "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((k: string) => k?.length >= 2) : [],
      category: parsed.category || null,
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes : [],
      maxPrice: typeof parsed.maxPrice === "number" ? parsed.maxPrice : null,
      minPrice: typeof parsed.minPrice === "number" ? parsed.minPrice : 0,
      isProductQuery: parsed.isProductQuery !== false,
    };
  } catch {
    return null;
  }
}

// ─── Vision: GROQ_KEY only — self-contained, no chat passthrough ──────────────

async function analyzeImage(imageBuffer: Buffer): Promise<string> {
  if (!GROQ_VISION_KEY) return "Vision analysis is currently unavailable.";
  try {
    const base64 = imageBuffer.toString("base64");
    // @ts-ignore
    const groq = new Groq({ apiKey: GROQ_VISION_KEY });
    const res = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: GROQ_VISION_PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      }],
      max_tokens: 512,
      temperature: 0.3,
    });
    const content = sanitizeAIResponse(res.choices[0]?.message?.content);
    console.log(`[Groq Vision] ✅ ${content.length} chars`);
    return content || "I could see the image but couldn't extract enough detail. Try a clearer photo?";
  } catch (e: any) {
    console.error("[Groq Vision] Failed:", e.message);
    return "I'm having trouble analyzing images right now. Describe what you're looking for instead?";
  }
}

// ─── Image Generation ─────────────────────────────────────────────────────────

async function generateImage(prompt: string): Promise<Buffer> {
  try {
    const hf = new HfInference(HF_KEY);
    const res = await hf.textToImage({ model: "tencent/HunyuanImage-3.0", inputs: IMAGE_GEN_ENHANCE_PROMPT(prompt) });
    return Buffer.from(await (res as any).arrayBuffer());
  } catch {
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(IMAGE_GEN_ENHANCE_PROMPT(prompt))}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Image generation failed");
    return Buffer.from(await res.arrayBuffer());
  }
}

// ─── Keyword Extraction (from vision analysis text) ──────────────────────────

function extractSearchKeywords(analysis: string): string {
  const keywordLine = analysis.match(/(?:keywords?|search terms?|tags?)[:\s]+([^\n.]+)/i);
  if (keywordLine) {
    const kw = keywordLine[1].split(/[,;]+/).map(k => k.trim().toLowerCase()).filter(k => k.length > 1).slice(0, 6);
    if (kw.length >= 2) return kw.join(" ");
  }
  const fashionTerms = ["sneakers","shoes","boot","sandal","shirt","dress","gown","jeans","trouser","bag","watch","cap","ankara","agbada","kaftan","black","white","red","blue","green","yellow","pink","purple","brown","grey","casual","formal","leather","suede","canvas","denim"];
  const lower = analysis.toLowerCase();
  const found = fashionTerms.filter(t => lower.includes(t)).slice(0, 6);
  if (found.length > 0) return found.join(" ");
  return analysis.split(/[.!?]/)[0]?.trim().replace(/\b(the|this|is|a|an|it|has|with|and|or|in|on|for|of|to|are)\b/gi, "").replace(/\s+/g, " ").trim() || analysis.substring(0, 50);
}

// ─── Bot Setup ────────────────────────────────────────────────────────────────

const globalForBot = globalThis as unknown as { veeBot?: Telegraf };

function createBot(): Telegraf {
  if (globalForBot.veeBot) return globalForBot.veeBot;
  const bot = new Telegraf(TELEGRAM_TOKEN);

  // ── /start ──────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const user = await getOrCreateUser(String(ctx.from.id), ctx.from.first_name, ctx.from.last_name);
    await ctx.reply(
      `Hey ${user.name || "there"}! 👋🔥\n\nWelcome to *Vendo* — I'm *Vee AI*, your personal AI shopping assistant!\n\n` +
      `🛍️ *Search products* — _"Show me black sneakers under ₦20,000"_\n` +
      `📸 *Analyze photos* — Send me a picture of any outfit\n` +
      `🎨 *Generate outfit previews* — Use /generate\n` +
      `📏 *Size recommendations* — Set your sizes with /mysize\n\n` +
      `Ready to shop? Just tell me what you need! 😊`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /help ────────────────────────────────────────────────────────────────
  bot.help(async (ctx) => {
    await ctx.reply(
      `🤖 *Vee AI — Commands*\n\n` +
      `/start — Start fresh\n/help — This message\n/shop — Browse products\n` +
      `/mysize — Set shoe & shirt sizes\n/generate [description] — AI outfit image\n/orders — Your recent orders\n\n` +
      `💡 Just type what you want — _"I need a red dress"_\n\nPowered by Rocybits Technology 🚀`,
      { parse_mode: "Markdown" }
    );
  });

  // ── /shop — Paginated product browser ───────────────────────────────────
  const PAGE_SIZE = 10;

  async function buildShopPage(offset: number) {
    const { prisma } = await import("@/lib/prisma");
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendo.com.ng";
    const all = await prisma.product.findMany({
      where: { isApproved: true, isActive: true, stock: { gt: 0 }, supplier: { isActive: true, kycStatus: "APPROVED" } },
      select: { id: true, name: true, sellingPrice: true, imageUrls: true, supplier: { select: { businessName: true, supplierType: true } } },
      orderBy: { createdAt: "desc" },
    });
    return { page: all.slice(offset, offset + PAGE_SIZE), hasMore: offset + PAGE_SIZE < all.length, total: all.length, siteUrl, offset };
  }

  function renderShopMessage(page: any[], offset: number, total: number, hasMore: boolean, siteUrl: string) {
    const lines = [`🛍️ *Vendo Store* — showing ${offset + 1}–${offset + page.length} of ${total} items\n`];
    for (let i = 0; i < page.length; i++) {
      const p = page[i];
      lines.push(`${offset + i + 1}. *${p.name}* — ₦${Number(p.sellingPrice).toLocaleString()}`);
      lines.push(`   🏪 ${p.supplier.businessName} · 🚚 ${p.supplier.supplierType === "LOCAL" ? "2-3 days" : "14-21 days"}`);
    }
    lines.push("\n_Tap View Image to preview, or Order to buy._");
    const keyboard: any[][] = page.map(p => [
      { text: `🖼 ${p.name.slice(0, 22)}`, url: p.imageUrls[0] ?? `${siteUrl}/vendo-logo.png` },
      { text: "🛒 Order", callback_data: `order:${p.id}` },
    ]);
    if (hasMore) keyboard.push([{ text: `➕ Load More (${total - offset - PAGE_SIZE} remaining)`, callback_data: `shop_page:${offset + PAGE_SIZE}` }]);
    else if (offset > 0) keyboard.push([{ text: "✅ You've seen everything!", callback_data: "shop_end" }]);
    return { text: lines.join("\n"), keyboard };
  }

  bot.command("shop", async (ctx) => {
    await withTyping(ctx, "typing", async () => {
      const { page, hasMore, total, siteUrl, offset } = await buildShopPage(0);
      if (page.length === 0) { await ctx.reply("🛍️ No products available right now. Check back soon!"); return; }
      const { text, keyboard } = renderShopMessage(page, offset, total, hasMore, siteUrl);
      await ctx.reply(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
    });
  });

  // ── /mysize ──────────────────────────────────────────────────────────────
  bot.command("mysize", async (ctx) => {
    const user = await getOrCreateUser(String(ctx.from.id), ctx.from.first_name);
    const args = ctx.message.text.replace(/^\/mysize\s*/, "").trim();
    if (!args) {
      await ctx.reply(`📏 *Your Size Profile*\n\n👟 Shoe: *${user.shoeSize || "Not set"}*\n👕 Shirt: *${user.shirtSize || "Not set"}*\n\nUpdate: \`/mysize shoe 43 shirt L\``, { parse_mode: "Markdown" });
      return;
    }
    const shoeMatch = args.match(/shoe\s+(\S+)/i);
    const shirtMatch = args.match(/shirt\s+(\S+)/i);
    if (!shoeMatch && !shirtMatch) { await ctx.reply("❓ Try: `/mysize shoe 43 shirt L`", { parse_mode: "Markdown" }); return; }
    await updateUserSizes(String(ctx.from.id), shoeMatch?.[1], shirtMatch?.[1]);
    const parts = [];
    if (shoeMatch) parts.push(`👟 Shoe: *${shoeMatch[1]}*`);
    if (shirtMatch) parts.push(`👕 Shirt: *${shirtMatch[1]}*`);
    await ctx.reply(`✅ Sizes updated!\n${parts.join("\n")}`, { parse_mode: "Markdown" });
  });

  // ── /generate ────────────────────────────────────────────────────────────
  bot.command("generate", async (ctx) => {
    const prompt = ctx.message.text.replace(/^\/generate\s*/, "").trim();
    if (!prompt) { await ctx.reply("🎨 Example:\n`/generate red ankara dress with gold accessories`", { parse_mode: "Markdown" }); return; }
    await ctx.reply("🎨 Generating your outfit preview... ⏳");
    try {
      const buf = await withTyping(ctx, "upload_photo", () => generateImage(prompt));
      await ctx.replyWithPhoto({ source: buf }, { caption: `✨ AI-generated outfit: "${prompt}"\n\nPowered by Vee AI 🛍️` });
    } catch {
      await ctx.reply("😅 Image generation is busy right now — try again in a minute!");
    }
  });

  // ── /orders ──────────────────────────────────────────────────────────────
  bot.command("orders", async (ctx) => {
    await withTyping(ctx, "typing", async () => {
      const orders = await getUserOrders(String(ctx.from.id));
      if (orders.length === 0) { await ctx.reply("📦 No orders yet! Type /shop to browse 🛍️"); return; }
      const formatted = orders.map((o: any, i: number) => {
        const items = (o.items as any[]).map((item: any) => `  • ${item.product.name} (x${item.quantity})`).join("\n");
        return `${i + 1}. *Order* — ₦${Number(o.totalAmount).toLocaleString()}\n   ${o.status} | ${o.paymentStatus}\n${items}`;
      }).join("\n\n");
      await ctx.reply(`📦 *Your Recent Orders*\n\n${formatted}`, { parse_mode: "Markdown" });
    });
  });

  // ── Voice / video note ───────────────────────────────────────────────────
  bot.on(message("voice"), async (ctx) => {
    await ctx.reply("🎙️ Voice messages aren't supported yet — please type your message instead! 😊\n\n💡 You can also send a photo and I'll find similar products.", { parse_mode: "Markdown" });
  });
  bot.on(message("video_note"), async (ctx) => {
    await ctx.reply("🎥 Video notes aren't supported yet — please type or send a photo instead! 😊");
  });

  // ── Photo handler — Vision is SELF-CONTAINED, no second AI pass ──────────
  // GROQ_KEY analyzes the image and replies directly with product matches.
  // No chatWithAI call — keeps vision key isolated and response instant.
  bot.on(message("photo"), async (ctx) => {
    await ctx.reply("📸 Analyzing your image... 🔍");
    try {
      const imageBuffer = await withTyping(ctx, "typing", async () => {
        const photos = ctx.message.photo;
        const file = await ctx.telegram.getFile(photos[photos.length - 1].file_id);
        const res = await fetch(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`);
        return Buffer.from(await res.arrayBuffer());
      });

      // Step 1: Vision analysis (GROQ_KEY only)
      const analysis = await withTyping(ctx, "typing", () => analyzeImage(imageBuffer));
      console.log(`[Photo] Vision: "${analysis.substring(0, 80)}"`);

      // Step 2: Extract keywords from vision output
      const keywords = extractSearchKeywords(analysis);

      // Step 3: Smart search — try Groq AI extraction first, regex fallback
      let searchParams = await aiExtractSearchParams(keywords);
      if (!searchParams) searchParams = extractSearchParams(keywords);

      // Step 4: Search DB
      const products = await searchProductsByParams(searchParams, 5);
      console.log(`[Photo] Found ${products.length} products`);

      // Step 5: Reply directly — no second AI call
      if (products.length === 0) {
        await ctx.reply(
          `📸 I analyzed your image!\n\n*What I see:* ${analysis.split(".")[0]}.\n\n` +
          `I couldn't find an exact match in our store right now, but try describing it in text and I'll search again! 🔍`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendo.com.ng";
      await ctx.reply(
        `📸 Found *${products.length} similar item${products.length > 1 ? "s" : ""}* in our store!\n\n` +
        `_Based on: ${analysis.split(".")[0].trim()}_`,
        { parse_mode: "Markdown" }
      );

      // Send up to 3 matching products with Order buttons
      for (const product of products.slice(0, 3)) {
        const sizes = typeof product.sizes === "object" && product.sizes !== null
          ? (product.sizes as any).available?.join(", ") || "Various"
          : "Various";
        const delivery = product.supplier.supplierType === "LOCAL" ? "2-3 days" : "14-21 days";
        const caption = `*${product.name}*\n₦${Number(product.sellingPrice).toLocaleString()}\n📏 ${sizes} · 🚚 ${delivery}`;

        if (product.imageUrls[0]) {
          try {
            await ctx.replyWithPhoto(product.imageUrls[0], {
              caption,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "🛒 Order This", callback_data: `order:${product.id}` }]] },
            });
            continue;
          } catch { /* fall through to text */ }
        }
        await ctx.reply(caption, {
          parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [[{ text: "🛒 Order This", callback_data: `order:${product.id}` }]] },
        });
      }
    } catch (err) {
      console.error("Photo handler error:", err);
      await ctx.reply("😅 Had trouble with that image — try sending it again or describe what you're looking for!");
    }
  });

  // ── Location ─────────────────────────────────────────────────────────────
  bot.on(message("location"), async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    await withTyping(ctx, "typing", async () => {
      try {
        await updateUserLocation(String(ctx.from.id), latitude, longitude);
        await ctx.reply("📍 *Location Saved!*\n\nI've updated your delivery coordinates. This helps find suppliers closer to you! 🚚", { parse_mode: "Markdown" });
      } catch {
        await ctx.reply("😅 Couldn't save your location. Please try again later.");
      }
    });
  });

  // ── Callback query handler ────────────────────────────────────────────────
  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as any).data as string;
    if (!data) return;

    // Shop pagination
    if (data.startsWith("shop_page:")) {
      const offset = parseInt(data.replace("shop_page:", ""), 10) || 0;
      await ctx.answerCbQuery("Loading more... 🛍️");
      try {
        const { page, hasMore, total, siteUrl } = await buildShopPage(offset);
        if (page.length === 0) { await ctx.answerCbQuery("No more products!"); return; }
        const { text, keyboard } = renderShopMessage(page, offset, total, hasMore, siteUrl);
        try {
          await ctx.editMessageText(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
        } catch {
          await ctx.reply(text, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
        }
      } catch (e: any) {
        console.error("Shop pagination error:", e);
        await ctx.answerCbQuery("Something went wrong. Try /shop again.");
      }
      return;
    }

    if (data === "shop_end") { await ctx.answerCbQuery("You've seen all our products! 🎉"); return; }

    // Order button
    if (data.startsWith("order:")) {
      const productId = data.replace("order:", "");
      const telegramId = String(ctx.from.id);
      await ctx.answerCbQuery("Starting your order... 🛍️");
      const { prisma } = await import("@/lib/prisma");
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { supplier: { select: { businessName: true, supplierType: true } } },
      });
      if (!product || !product.isApproved || !product.isActive || product.stock < 1) {
        await ctx.reply("❌ Sorry, that product is no longer available.");
        return;
      }
      checkoutState.set(telegramId, { productId, step: "phone" });
      await ctx.reply(
        `🛍️ *${product.name}*\n💰 ₦${Number(product.sellingPrice).toLocaleString()}\n🏪 ${product.supplier.businessName}\n🚚 ${product.supplier.supplierType === "LOCAL" ? "2-3 business days" : "14-21 business days"}\n\n📱 *What's your phone number?*\n_(e.g. 08012345678)_`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Delivery confirmed
    if (data.startsWith("received:")) {
      const orderId = data.replace("received:", "");
      await ctx.answerCbQuery("Processing... ✅");
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendo.com.ng"}/api/supplier/wallet/confirm-delivery`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "" },
          body: JSON.stringify({ orderId }),
        });
        const result = await res.json();
        if (!res.ok) { await ctx.reply(`❌ ${result.message || "Could not confirm delivery."}`); return; }
        try { await ctx.editMessageReplyMarkup({ inline_keyboard: [] }); } catch { /* too old */ }
        await ctx.reply(
          `✅ *Delivery Confirmed!*\n\nThank you! 🙏 The supplier's payment is now in the 24-hour review period.\n\nType /orders to view your order history.`,
          { parse_mode: "Markdown" }
        );
      } catch (e: any) {
        console.error("Delivery confirm error:", e);
        await ctx.reply("❌ Something went wrong. Please try again or contact support.");
      }
      return;
    }
  });

  // ── Text message handler ──────────────────────────────────────────────────
  bot.on(message("text"), async (ctx) => {
    const userMessage = ctx.message.text;
    const telegramId = String(ctx.from.id);

    // Checkout state machine
    const pending = checkoutState.get(telegramId);
    if (pending) {
      if (pending.step === "phone") {
        const phone = userMessage.trim().replace(/\s/g, "");
        if (!/^(\+234|0)[789][01]\d{8}$/.test(phone)) {
          await ctx.reply("❌ Invalid Nigerian phone number. Try: 08012345678 or +2348012345678");
          return;
        }
        checkoutState.set(telegramId, { ...pending, phone, step: "address" });
        await ctx.reply("📍 *Delivery Address*\n\nPlease type your full delivery address:\n_Example: 12 Awka Road, Onitsha, Anambra_", { parse_mode: "Markdown" });
        return;
      }
      if (pending.step === "address") {
        const address = userMessage.trim();
        if (address.length < 10) { await ctx.reply("Please enter a more complete address (street, city, state):"); return; }
        checkoutState.set(telegramId, { ...pending, address, step: "confirm" });
        const { prisma } = await import("@/lib/prisma");
        const product = await prisma.product.findUnique({ where: { id: pending.productId }, include: { supplier: { select: { businessName: true } } } });
        if (!product) { checkoutState.delete(telegramId); await ctx.reply("❌ Product no longer available."); return; }
        await ctx.reply(
          `📋 *Order Summary*\n\n🛍️ *${product.name}*\n💰 ₦${Number(product.sellingPrice).toLocaleString()}\n🏪 ${product.supplier.businessName}\n📱 ${pending.phone}\n📍 ${address}\n\nReply *YES* to confirm or *NO* to cancel.`,
          { parse_mode: "Markdown" }
        );
        return;
      }
      if (pending.step === "confirm") {
        const answer = userMessage.trim().toUpperCase();
        if (answer === "NO" || answer === "CANCEL") {
          checkoutState.delete(telegramId);
          await ctx.reply("❌ Order cancelled. Just tell me what you're looking for! 😊");
          return;
        }
        if (answer === "YES" || answer === "Y" || answer === "CONFIRM") {
          checkoutState.delete(telegramId);
          await ctx.reply("⏳ Creating your order...");
          try {
            const order = await createOrder(telegramId, pending.productId, pending.phone, pending.address);
            const paymentLink = await generatePaymentLink(order.id);
            const productName = (order as any).items[0]?.product?.name ?? "Item";
            await ctx.reply(
              `✅ *Order Created!*\n\nOrder: *#${(order as any).orderNumber}*\nItem: *${productName}*\nTotal: *₦${Number(order.totalAmount).toLocaleString()}*\n\n💳 *Tap below to pay securely:*\n${paymentLink}\n\n⏰ Link expires in 30 minutes.`,
              { parse_mode: "Markdown" }
            );
          } catch (e: any) {
            await ctx.reply(`❌ Something went wrong: ${e.message}\n\nPlease try again or contact support.`);
          }
          return;
        }
        await ctx.reply("Please reply *YES* to confirm or *NO* to cancel.", { parse_mode: "Markdown" });
        return;
      }
    }
    // ── Order lookup and delivery confirmation handler ────────────────────────
    const orderNumMatch = userMessage.match(/(?:order\s*#?\s*|#)?(VND[- ]?\d+(?:[- ]?\d+)?)/i);
    const lowerMsg = userMessage.toLowerCase();
    
    // Check if the user is reporting they HAVE NOT received their order
    const isNegativeReceive = /\b(not|never|haven't|havent|don't|dont|didn't|didnt|still\s+waiting|where\s+is)\b.*\b(received|receive|delivered|delivery|package|goods|order)\b/i.test(lowerMsg);
    const isOrderIntent = /\b(confirm|received|receive|delivered|delivery|order|orders|track|status|package)\b/.test(lowerMsg);

    if (isNegativeReceive && !pending) {
      try {
        await withTyping(ctx, "typing", async () => {
          const orders = await getUserOrders(telegramId);
          if (orders.length === 0) {
            await ctx.reply("📦 I couldn't find any orders on your account to track. Let me know if you want to /shop! 🛍️");
            return;
          }
          
          // Let's check the most recent active/undelivered order
          const activeOrder = orders.find((o: any) => o.status !== "DELIVERED" && o.status !== "CANCELLED") || orders[0];
          const itemsList = activeOrder.items.map((i: any) => `• ${i.product.name} (x${i.quantity})`).join("\n");
          const orderNumber = activeOrder.orderNumber;
          
          let responseText = "";
          if (activeOrder.status === "PENDING") {
            responseText = `⏳ *Order #${orderNumber} is Pending*\n\n` +
              `Items:\n${itemsList}\n\n` +
              `We've received your order, but payment hasn't cleared or the supplier hasn't confirmed it yet. If you've already paid, no worries — the supplier will start preparing it soon!`;
          } else if (activeOrder.status === "CONFIRMED") {
            responseText = `📦 *Order #${orderNumber} is Confirmed!*\n\n` +
              `Items:\n${itemsList}\n\n` +
              `The supplier is currently preparing your package. 🚚 LOCAL suppliers deliver in 2-3 business days, while DROPSHIP suppliers take 14-21 days.\n\n` +
              `I will notify you here the moment it gets shipped! Stay tuned. 😊`;
          } else if (activeOrder.status === "SHIPPED") {
            responseText = `🚚 *Order #${orderNumber} has Shipped!*\n\n` +
              `Items:\n${itemsList}\n\n` +
              `Your package is currently in transit! It should arrive very soon.\n\n` +
              `*Note:* Once it actually gets to you, please remember to click the confirmation button to release payment to the supplier. (Please *do not* click it until you hold the package in your hands!)`;
          } else if (activeOrder.status === "DELIVERED") {
            responseText = `✅ *Order #${orderNumber} is marked Delivered!*\n\n` +
              `Items:\n${itemsList}\n\n` +
              `Our records show this order was already confirmed as received. If you have any issues or didn't actually receive it, please contact Rocybits support immediately!`;
          } else {
            responseText = `❓ *Order #${orderNumber} Status: ${activeOrder.status}*\n\n` +
              `Items:\n${itemsList}\n\n` +
              `If you need help tracking this, just ask!`;
          }
          
          await ctx.reply(responseText, { parse_mode: "Markdown" });
        });
      } catch (err) {
        console.error("Negative receive handling error:", err);
        await ctx.reply("😅 I had trouble checking your order status. Please try typing /orders to see your recent orders!");
      }
      return;
    }

    if (orderNumMatch || (isOrderIntent && !pending)) {
      try {
        await withTyping(ctx, "typing", async () => {
          let targetOrder = null;

          if (orderNumMatch) {
            const orderNumberStr = orderNumMatch[1].toUpperCase().replace(/[\s-]/g, "");
            let queryOrderNumber = orderNumberStr;
            if (orderNumberStr.startsWith("VND") && !orderNumberStr.includes("-")) {
              queryOrderNumber = "VND-" + orderNumberStr.slice(3);
            }
            const { prisma } = await import("@/lib/prisma");
            targetOrder = await prisma.order.findFirst({
              where: {
                orderNumber: { equals: queryOrderNumber, mode: "insensitive" }
              },
              include: {
                items: { include: { product: { select: { name: true } } } },
                user: true
              }
            });
          }

          if (targetOrder) {
            if (targetOrder.user.telegramId !== telegramId) {
              await ctx.reply("❌ This order does not belong to your account.");
              return;
            }
            const itemsList = targetOrder.items.map(i => `• ${i.product.name} (x${i.quantity})`).join("\n");
            const statusEmoji = targetOrder.status === "DELIVERED" ? "✅" : targetOrder.status === "SHIPPED" ? "🚚" : "⏳";
            const paymentEmoji = targetOrder.paymentStatus === "PAID" ? "💳" : "❌";
            
            let text = `${statusEmoji} *Order Details*\n\n` +
              `Order: *#${targetOrder.orderNumber}*\n` +
              `Items:\n${itemsList}\n\n` +
              `Total: *₦${Number(targetOrder.totalAmount).toLocaleString()}*\n` +
              `Status: *${targetOrder.status}*\n` +
              `Payment: *${targetOrder.paymentStatus} ${paymentEmoji}*`;

            const keyboard: any[][] = [];
            if (targetOrder.paymentStatus === "PAID" && targetOrder.status !== "DELIVERED") {
              keyboard.push([{ text: "✅ Confirm Delivery (I Received It)", callback_data: `received:${targetOrder.id}` }]);
            }
            
            await ctx.reply(text, { parse_mode: "Markdown", reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined });
            return;
          }

          // If they have general order intent but we didn't match a specific order number
          const orders = await getUserOrders(telegramId);
          if (orders.length === 0) {
            await ctx.reply("📦 You don't have any orders yet! Type /shop to browse and purchase items. 🛍️");
            return;
          }

          // Find if they have active orders that need delivery confirmation (PAID but not yet DELIVERED)
          const confirmableOrders = orders.filter((o: any) => o.paymentStatus === "PAID" && o.status !== "DELIVERED");

          if (confirmableOrders.length > 0) {
            let replyText = `📦 *Confirm Delivery*\n\nYou have order(s) awaiting your delivery confirmation. Tap the button below to confirm you have received your items and release payment to the supplier:\n\n`;
            
            const keyboard: any[][] = [];
            confirmableOrders.forEach((o: any, index: number) => {
              const items = o.items.map((i: any) => i.product.name).join(", ");
              replyText += `${index + 1}. *Order #${o.orderNumber}* — ${items}\n   Status: *${o.status}*\n\n`;
              keyboard.push([{ text: `✅ Received Order #${o.orderNumber}`, callback_data: `received:${o.id}` }]);
            });

            await ctx.reply(replyText, { parse_mode: "Markdown", reply_markup: { inline_keyboard: keyboard } });
            return;
          } else {
            // General order status overview
            let replyText = `📦 *Your Recent Orders*\n\n`;
            orders.forEach((o: any, index: number) => {
              const items = o.items.map((i: any) => `• ${i.product.name} (x${i.quantity})`).join("\n");
              const statusEmoji = o.status === "DELIVERED" ? "✅" : o.status === "SHIPPED" ? "🚚" : "⏳";
              replyText += `${index + 1}. *Order #${o.orderNumber}* (${statusEmoji} ${o.status})\n` +
                `   Items:\n${items}\n` +
                `   Total: ₦${Number(o.totalAmount).toLocaleString()}\n\n`;
            });
            
            await ctx.reply(replyText, { parse_mode: "Markdown" });
            return;
          }
        });
      } catch (err) {
        console.error("Order lookup error:", err);
        await ctx.reply("😅 Sorry, had trouble looking up your order details. Please try again!");
      }
      return;
    }

    // Regular AI chat with smart product search
    try {
      await withTyping(ctx, "typing", async () => {
        const lowerMsg = userMessage.toLowerCase();
        const isLikelyProductQuery = /\b(show|find|want|need|looking|buy|order|price|cheap|sneaker|shoe|shirt|dress|bag|trouser|jean|jacket|cap|watch|ring|necklace|ankara|agbada|kaftan|under|below|above|₦|naira|have|available|stock|catalog|sell|product|products|item|items|store|shop|stuff|wear|clothe|clothes|anything|something)\b/.test(lowerMsg);

        // Run user lookup and smart product search in parallel
        const [user, products] = await Promise.all([
          getOrCreateUser(telegramId, ctx.from.first_name, ctx.from.last_name),
          isLikelyProductQuery
            ? (async () => {
                const aiParams = await aiExtractSearchParams(userMessage);
                const params = aiParams ?? extractSearchParams(userMessage);
                if (!params.isProductQuery) return [];
                return searchProductsByParams(params, 5);
              })()
            : Promise.resolve([]),
        ]);

        const catalog = formatProductsForAI(products as any);
        const profile = formatUserProfileForAI(user);
        const reply = await chatWithAI(telegramId, userMessage, `${catalog}\n\n${profile}`);
        console.log(`[Bot] Reply for ${telegramId}: ${reply.substring(0, 80)}...`);

        await ctx.reply(truncate(sanitizeMarkdown(reply)), { parse_mode: "Markdown" });

        // Only send product photo if AI actually mentioned the product
        if (
          (products as any[]).length > 0 &&
          (products as any[])[0].imageUrls[0] &&
          isLikelyProductQuery &&
          reply.toLowerCase().includes((products as any[])[0].name.toLowerCase().slice(0, 8))
        ) {
          try {
            const p = (products as any[])[0];
            await ctx.replyWithPhoto(p.imageUrls[0], {
              caption: `*${p.name}*\n₦${Number(p.sellingPrice).toLocaleString()}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "🛒 Order This", callback_data: `order:${p.id}` }]] },
            });
          } catch { /* skip invalid URLs */ }
        }
      });
    } catch (err) {
      console.error("Chat error:", err);
      try { await ctx.reply("😅 Oops, something went wrong. Try again in a moment!"); } catch { /* ignore */ }
    }
  });

  if (process.env.NODE_ENV !== "production") globalForBot.veeBot = bot;
  return bot;
}

export const bot = createBot();
