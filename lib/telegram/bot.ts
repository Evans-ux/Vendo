// lib/telegram/bot.ts
// Vee AI — Telegram bot
// Architecture: Ollama (chat, dynamic model) → OpenRouter (chat fallback) | Groq (vision) | HuggingFace/Pollinations (image gen)

import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
// @ts-ignore
import Groq from "groq-sdk";
import { Ollama } from "ollama";
import { HfInference } from "@huggingface/inference";
import OpenAI from "openai";

import {
  VEE_AI_SYSTEM_PROMPT,
  GROQ_VISION_PROMPT,
  IMAGE_GEN_ENHANCE_PROMPT,
} from "./prompts";
import {
  searchProducts,
  searchProductsByParams,
  extractSearchParams,
  getLatestProducts,
  formatProductsForAI,
  getOrCreateUser,
  updateUserSizes,
  formatUserProfileForAI,
  getUserOrders,
  createOrder,
  generatePaymentLink,
  updateUserLocation
} from "./services";

// ─── Environment Variables ───────────────────────────────────────────────────

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const GROQ_KEY = (process.env.GROQ_API ?? process.env.GROQ_API_KEY ?? "").trim();
const HF_KEY = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || "").trim();
const OLLAMA_URL = (process.env.OLLAMA_URL || "https://ollama.com").replace(/\/+$/, "");
const OLLAMA_KEY = (process.env.OLLAMA_API_KEY || "").trim();
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

// Ollama Cloud is available when an API key is set.
// The cloud endpoint is https://ollama.com/api — no local install needed.
const OLLAMA_AVAILABLE = OLLAMA_KEY.length > 0;

if (!TELEGRAM_TOKEN) console.error("⚠️  Missing TELEGRAM_BOT_TOKEN in .env");

// ─── Ollama Dynamic Model Selection ─────────────────────────────────────────

let ollamaModelName: string | null = null;
let ollamaModelFetched = false;

/**
 * Fetch available models from the Ollama instance and pick the best one.
 * Caches the result so we only fetch once per cold start.
 */
async function getOllamaModel(): Promise<string> {
  if (!OLLAMA_AVAILABLE) return "llama3"; // won't be used, just a placeholder
  if (ollamaModelFetched && ollamaModelName) return ollamaModelName;

  try {
    // Use the OpenAI-compatible /v1/models endpoint on Ollama Cloud
    const res = await fetch(`${OLLAMA_URL}/v1/models`, {
      headers: { Authorization: `Bearer ${OLLAMA_KEY}` },
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    const models: string[] = (data.data || [])
      .map((m: any) => (m.id || "").trim())
      .filter((name: string) => name.length > 0);

    if (models.length > 0) {
      // Prefer free-tier models — gemma3:4b and ministral-3:3b are free on Ollama Cloud
      const preferred =
        models.find((m) => m === "gemma3:4b") ||
        models.find((m) => m === "ministral-3:3b") ||
        models.find((m) => m === "gemma3:12b") ||
        models.find((m) => m.includes("gemma3")) ||
        models.find((m) => m.includes("ministral")) ||
        models[0];
      ollamaModelName = preferred;
      console.log(`[Ollama Cloud] Selected model: ${ollamaModelName} (${models.length} available)`);
    } else {
      console.warn("[Ollama Cloud] No models found, using gemma3:4b");
      ollamaModelName = "gemma3:4b";
    }
  } catch (error: any) {
    console.warn(`[Ollama Cloud] Failed to fetch models: ${error.message}. Using gemma3:4b`);
    ollamaModelName = "gemma3:4b";
  }

  ollamaModelFetched = true;
  return ollamaModelName ?? "gemma3:4b";
}

// ─── Conversation Memory (in-memory, resets on cold start) ──────────────────

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const conversations = new Map<string, ChatMessage[]>();
const MAX_HISTORY = 16; // keep last 16 messages per user

function getHistory(telegramId: string): ChatMessage[] {
  return conversations.get(telegramId) ?? [];
}

function pushHistory(telegramId: string, msg: ChatMessage) {
  const history = getHistory(telegramId);
  history.push(msg);
  // Trim to max length
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
  conversations.set(telegramId, history);
}

// ─── Checkout State Machine ───────────────────────────────────────────────────
// Tracks multi-step checkout conversations per user

interface CheckoutState {
  productId: string;
  step: "phone" | "address" | "confirm";
  phone?: string;
  address?: string;
}

const checkoutState = new Map<string, CheckoutState>();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Truncate text to fit Telegram's 4096-char message limit */
function truncate(text: string, max = 4000): string {
  if (text.length <= max) return text;
  return text.substring(0, max) + "\n\n… (truncated)";
}

/** 
 * Sanitize AI output for Telegram's legacy Markdown mode.
 * Converts **bold** to *bold* and escapes underscores (often found in URLs/filenames).
 */
function sanitizeMarkdown(text: string): string {
  return text
    .replace(/\*\*/g, "*") // Convert standard Markdown **bold** to Telegram *bold*
    .replace(/_/g, "\\_"); // Escape underscores to prevent unclosed italic entity errors
}

/**
 * Sanitize AI response — ensure we never return an empty or whitespace-only string.
 */
function sanitizeAIResponse(reply: string | null | undefined): string {
  const cleaned = (reply || "").trim();
  if (!cleaned || cleaned.length === 0) {
    return "";
  }
  return cleaned;
}

/** Send a "typing…" indicator while running an async operation */
async function withTyping<T>(
  ctx: any,
  action: string,
  fn: () => Promise<T>
): Promise<T> {
  await ctx.sendChatAction(action as any).catch(() => {});
  // Refresh typing every 4s for long operations
  const interval = setInterval(() => {
    ctx.sendChatAction(action as any).catch(() => {});
  }, 4000);
  try {
    return await fn();
  } finally {
    clearInterval(interval);
  }
}

// ─── Ollama Chat (Primary) → OpenRouter Fallback ─────────────────────────────

async function chatWithAI(
  telegramId: string,
  userMessage: string,
  extraContext: string = ""
): Promise<string> {
  const contextualMessage = extraContext
    ? `${userMessage}\n\n${extraContext}`
    : userMessage;

  pushHistory(telegramId, { role: "user", content: userMessage });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: VEE_AI_SYSTEM_PROMPT },
    ...getHistory(telegramId).slice(0, -1),
    { role: "user", content: contextualMessage },
  ];

  let reply = "";

  // ── Primary: Ollama Cloud ─────────────────────────────────────────────
  // Uses the OpenAI-compatible endpoint at https://ollama.com/v1
  // Requires OLLAMA_API_KEY from ollama.com/settings/api-keys
  // Cloud models run on Ollama's servers — no local GPU needed
  if (OLLAMA_AVAILABLE) {
    try {
      const modelName = await getOllamaModel();
      console.log(`[Ollama Cloud] Sending chat to model: ${modelName}`);

      const ollamaCloud = new OpenAI({
        baseURL: `${OLLAMA_URL}/v1`,
        apiKey: OLLAMA_KEY,
      });

      const completion = await ollamaCloud.chat.completions.create({
        model: modelName,
        messages,
      });

      reply = sanitizeAIResponse(completion.choices[0]?.message?.content);
      if (reply) {
        console.log(`[Ollama Cloud] ✅ Got response (${reply.length} chars) from ${modelName}`);
      } else {
        console.warn(`[Ollama Cloud] ⚠️ Empty response from ${modelName}, falling back...`);
        throw new Error("Ollama Cloud returned empty response");
      }
    } catch (ollamaError: any) {
      console.warn(`⚠️ Ollama Cloud failed: ${ollamaError.message}. Falling back to OpenRouter...`);
    }
  } else {
    console.log("[Chat] No OLLAMA_API_KEY set — using OpenRouter directly");
  }

  // ── Fallback (or primary when Ollama is off): OpenRouter ─────────────
  if (!reply) {
    try {
      if (!OPENROUTER_KEY) throw new Error("Missing OPENROUTER_API_KEY");

      const openRouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OPENROUTER_KEY,
        defaultHeaders: {
          "HTTP-Referer": "https://vendo.ng",
          "X-Title": "Vendo Vee AI",
        },
      });

      const completion = await openRouter.chat.completions.create({
        model: "openrouter/free",
        messages,
      });

      reply = sanitizeAIResponse(completion.choices[0]?.message?.content);
      if (reply) {
        console.log(`[OpenRouter] ✅ Response (${reply.length} chars), model: ${completion.model}`);
      } else {
        console.warn("[OpenRouter] ⚠️ Empty response");
      }
    } catch (orError: any) {
      console.error("❌ OpenRouter failed:", orError.message);
    }
  }

  if (!reply) {
    reply = "Sorry, I couldn't process that right now. Both AI services are a bit busy — please try again in a moment! 🙏";
  }

  pushHistory(telegramId, { role: "assistant", content: reply });
  return reply;
}

// ─── Groq Vision Analysis ────────────────────────────────────────────────────

async function analyzeImage(imageBuffer: Buffer): Promise<string> {
  if (!GROQ_KEY) return "Vision analysis is currently unavailable (Missing Groq API Key).";

  try {
    const base64Image = imageBuffer.toString("base64");

    // @ts-ignore
    const groq = new Groq({ apiKey: GROQ_KEY });

    const response = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: GROQ_VISION_PROMPT },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
          ],
        },
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    const content = sanitizeAIResponse(response.choices[0]?.message?.content);
    console.log(`[Groq Vision] ✅ Analysis result (${content.length} chars): ${content.substring(0, 100)}...`);

    if (!content) {
      return "I could see the image but couldn't extract enough detail. Could you try a clearer photo?";
    }
    return content;
  } catch (error: any) {
    console.error("❌ Groq Vision Error:", error.message);

    // Fallback: try OpenRouter for vision if Groq fails
    if (OPENROUTER_KEY) {
      try {
        console.log("[Vision] Trying OpenRouter as vision fallback...");
        const base64Image = imageBuffer.toString("base64");
        const openRouter = new OpenAI({
          baseURL: "https://openrouter.ai/api/v1",
          apiKey: OPENROUTER_KEY,
          defaultHeaders: {
            "HTTP-Referer": "https://vendo.ng",
            "X-Title": "Vendo Vee AI",
          },
        });

        const response = await openRouter.chat.completions.create({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: GROQ_VISION_PROMPT },
                {
                  type: "image_url",
                  image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                },
              ],
            },
          ],
        });

        const fallbackContent = sanitizeAIResponse(response.choices[0]?.message?.content);
        if (fallbackContent) {
          console.log(`[OpenRouter Vision Fallback] ✅ Got analysis (${fallbackContent.length} chars)`);
          return fallbackContent;
        }
      } catch (fallbackErr: any) {
        console.error("❌ OpenRouter vision fallback also failed:", fallbackErr.message);
      }
    }

    return "I'm having trouble analyzing images right now. Could you describe what you're looking for instead?";
  }
}

// ─── HuggingFace Image Generation ────────────────────────────────────────────

async function generateImage(prompt: string): Promise<Buffer> {
  try {
    // Primary: Hugging Face
    const hf = new HfInference(HF_KEY);
    const response = await hf.textToImage({
      model: "tencent/HunyuanImage-3.0",
      inputs: IMAGE_GEN_ENHANCE_PROMPT(prompt),
    });
    return Buffer.from(await (response as any).arrayBuffer());
  } catch (error: any) {
    console.warn("⚠️ Hugging Face image gen failed (likely quota), falling back to Pollinations:", error.message);
    
    // Fallback: Pollinations.ai (No credits/key required)
    const enhancedPrompt = encodeURIComponent(IMAGE_GEN_ENHANCE_PROMPT(prompt));
    const url = `https://image.pollinations.ai/prompt/${enhancedPrompt}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Both HF and Pollinations failed to generate image");
    return Buffer.from(await response.arrayBuffer());
  }
}

// ─── Bot Setup ───────────────────────────────────────────────────────────────

// Singleton — only create one bot instance across hot reloads
const globalForBot = globalThis as unknown as { veeBot?: Telegraf };

function createBot(): Telegraf {
  if (globalForBot.veeBot) return globalForBot.veeBot;

  const bot = new Telegraf(TELEGRAM_TOKEN);

  // ── /start ─────────────────────────────────────────────────────────────
  bot.start(async (ctx) => {
    const user = await getOrCreateUser(
      String(ctx.from.id),
      ctx.from.first_name,
      ctx.from.last_name
    );

    const welcome = `Hey ${user.name || "there"}! 👋🔥

Welcome to *Vendo* — I'm *Vee AI*, your personal AI shopping assistant!

Here's what I can do for you:

🛍️ *Search products* — Just tell me what you're looking for
  _"Show me black sneakers under ₦20,000"_

📸 *Analyze photos* — Send me a picture of any outfit and I'll find similar items in our store

🎨 *Generate outfit previews* — Use /generate to see AI-created outfit ideas

📏 *Size recommendations* — Set your sizes with /mysize and I'll always suggest the right fit

Ready to shop? Just tell me what you need! 😊`;

    await ctx.reply(welcome, { parse_mode: "Markdown" });
  });

  // ── /help ──────────────────────────────────────────────────────────────
  bot.help(async (ctx) => {
    const helpText = `🤖 *Vee AI — Your Commands*

/start — Start fresh with Vee AI
/help — Show this help message
/shop — Browse our latest products
/mysize — Set or view your shoe & shirt sizes
/generate \\[description\\] — Generate an AI outfit image
/orders — View your recent orders

💡 *Tips:*
• Just type what you want — _"I need a red dress"_
• Send me a photo and I'll find matching products
• Ask me for style advice — _"What goes with white sneakers?"_

Powered by Rocybits Technology 🚀`;

    await ctx.reply(helpText, { parse_mode: "Markdown" });
  });

  // ── /shop — Browse latest products ─────────────────────────────────────
  bot.command("shop", async (ctx) => {
    await withTyping(ctx, "typing", async () => {
      const products = await getLatestProducts(5);
      const catalog = formatProductsForAI(products);

      const reply = await chatWithAI(
        String(ctx.from.id),
        "Show me the latest products available in the store",
        catalog
      );

      await ctx.reply(truncate(sanitizeMarkdown(reply)), { parse_mode: "Markdown" });

      // Send first product image if available
      if (products.length > 0 && products[0].imageUrls[0]) {
        try {
          await ctx.replyWithPhoto(products[0].imageUrls[0], {
            caption: `*${products[0].name}*\n₦${Number(products[0].sellingPrice).toLocaleString()}`,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[
                { text: "🛒 Order This", callback_data: `order:${products[0].id}` }
              ]]
            }
          });
        } catch {
          // Image URL might be expired or invalid — skip silently
        }
      }
    });
  });

  // ── /mysize — Set or view sizes ────────────────────────────────────────
  bot.command("mysize", async (ctx) => {
    const user = await getOrCreateUser(
      String(ctx.from.id),
      ctx.from.first_name
    );

    const args = ctx.message.text.replace(/^\/mysize\s*/, "").trim();

    if (!args) {
      // Show current sizes
      const shoe = user.shoeSize || "Not set";
      const shirt = user.shirtSize || "Not set";
      await ctx.reply(
        `📏 *Your Size Profile*\n\n👟 Shoe size: *${shoe}*\n👕 Shirt size: *${shirt}*\n\nTo update, send:\n\`/mysize shoe 43 shirt L\`\nor\n\`/mysize shoe 42\`\nor\n\`/mysize shirt XL\``,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Parse size updates
    const shoeMatch = args.match(/shoe\s+(\S+)/i);
    const shirtMatch = args.match(/shirt\s+(\S+)/i);

    if (!shoeMatch && !shirtMatch) {
      await ctx.reply(
        "❓ I didn't catch that. Try:\n`/mysize shoe 43 shirt L`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await updateUserSizes(
      String(ctx.from.id),
      shoeMatch?.[1],
      shirtMatch?.[1]
    );

    const parts: string[] = [];
    if (shoeMatch) parts.push(`👟 Shoe: *${shoeMatch[1]}*`);
    if (shirtMatch) parts.push(`👕 Shirt: *${shirtMatch[1]}*`);

    await ctx.reply(`✅ Sizes updated!\n${parts.join("\n")}`, {
      parse_mode: "Markdown",
    });
  });

  // ── /generate — AI outfit image generation ─────────────────────────────
  bot.command("generate", async (ctx) => {
    const prompt = ctx.message.text.replace(/^\/generate\s*/, "").trim();

    if (!prompt) {
      await ctx.reply(
        "🎨 Tell me what to generate!\n\nExample:\n`/generate red ankara dress with gold accessories`",
        { parse_mode: "Markdown" }
      );
      return;
    }

    await ctx.reply("🎨 Generating your outfit preview... this may take a moment ⏳");

    try {
      const imageBuffer = await withTyping(ctx, "upload_photo", () =>
        generateImage(prompt)
      );

      await ctx.replyWithPhoto(
        { source: imageBuffer },
        { caption: `✨ AI-generated outfit: "${prompt}"\n\nPowered by Vee AI 🛍️` }
      );
    } catch (error) {
      console.error("Image generation error:", error);
      await ctx.reply(
        "😅 Sorry, I couldn't generate that image right now. The AI image service might be busy — try again in a minute!"
      );
    }
  });

  // ── /orders — View recent orders ───────────────────────────────────────
  bot.command("orders", async (ctx) => {
    await withTyping(ctx, "typing", async () => {
      const orders = await getUserOrders(String(ctx.from.id));

      if (orders.length === 0) {
        await ctx.reply(
          "📦 You don't have any orders yet!\n\nStart shopping by telling me what you're looking for, or type /shop to browse 🛍️"
        );
        return;
      }

      const formatted = orders
        .map((o:any, i:number) => {
          const items = (o.items as any[])
            .map((item: any) => `  • ${item.product.name} (x${item.quantity})`)
            .join("\n");
          const status = o.status.charAt(0) + o.status.slice(1).toLowerCase();
          return `${i + 1}. *Order* — ₦${Number(o.totalAmount).toLocaleString()}\n   Status: ${status} | ${o.paymentStatus}\n${items}`;
        })
        .join("\n\n");

      await ctx.reply(`📦 *Your Recent Orders*\n\n${formatted}`, {
        parse_mode: "Markdown",
      });
    });
  });

  // ── Voice note handler — Polite "not supported" ────────────────────────
  bot.on(message("voice"), async (ctx) => {
    await ctx.reply(
      "🎙️ Thanks for the voice note! Unfortunately, voice messages aren't supported just yet.\n\n" +
      "Please type your message instead and I'll be happy to help you find exactly what you need! 😊\n\n" +
      "💡 *Tip:* You can also send me photos of items you like and I'll find similar products in our store!",
      { parse_mode: "Markdown" }
    );
  });

  // Also handle video notes (circular video messages in Telegram)
  bot.on(message("video_note"), async (ctx) => {
    await ctx.reply(
      "🎥 Thanks for the video message! Unfortunately, video notes aren't supported just yet.\n\n" +
      "Please type your message or send a photo instead and I'll be happy to help! 😊",
      { parse_mode: "Markdown" }
    );
  });

  // ── Photo handler — Groq vision + product matching ─────────────────────
  bot.on(message("photo"), async (ctx) => {
    await ctx.reply("📸 Nice! Let me analyze this image... 🔍");

    try {
      const imageBuffer = await withTyping(ctx, "typing", async () => {
        // Get highest resolution photo
        const photos = ctx.message.photo;
        const fileId = photos[photos.length - 1].file_id;

        // Download the image from Telegram
        const file = await ctx.telegram.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${file.file_path}`;
        const response = await fetch(fileUrl);
        return Buffer.from(await response.arrayBuffer());
      });

      // Step 1: Analyze with Groq Vision
      const analysis = await withTyping(ctx, "typing", () =>
        analyzeImage(imageBuffer)
      );

      console.log(`[Photo Handler] Vision analysis: "${analysis}"`);

      // Step 2: Extract search keywords from the analysis
      // The vision model returns a paragraph — extract meaningful search terms
      const searchKeywords = extractSearchKeywords(analysis);
      console.log(`[Photo Handler] Extracted search keywords: "${searchKeywords}"`);

      // Step 3: Use Ollama/OpenRouter to intelligently parse the vision output into structured search params
      const searchParams = await extractSearchParams(searchKeywords);
      console.log(`[Photo Handler] Smart search params:`, JSON.stringify(searchParams));

      // Step 4: Search for matching products using structured params
      const products = await searchProductsByParams(searchParams, 5);
      console.log(`[Photo Handler] Found ${products.length} matching products`);

      const catalog = formatProductsForAI(products);

      // Step 4: Get user profile
      const user = await getOrCreateUser(
        String(ctx.from.id),
        ctx.from.first_name
      );
      const profile = formatUserProfileForAI(user);

      // Step 5: Build context and send to AI for a natural response
      const extraContext = `[IMAGE ANALYSIS by Groq Vision]\n${analysis}\n\n${catalog}\n\n${profile}`;

      const reply = await chatWithAI(
        String(ctx.from.id),
        "I just sent you a photo of a fashion item. Based on your analysis, what is it and do you have anything similar in the store?",
        extraContext
      );

      await ctx.reply(truncate(sanitizeMarkdown(reply)), { parse_mode: "Markdown" });

      // Send matching product images with Order buttons
      for (const product of products.slice(0, 3)) {
        if (product.imageUrls[0]) {
          try {
            await ctx.replyWithPhoto(product.imageUrls[0], {
              caption: `*${product.name}*\n₦${Number(product.sellingPrice).toLocaleString()}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[
                  { text: "🛒 Order This", callback_data: `order:${product.id}` }
                ]]
              }
            });
          } catch {
            // Skip invalid image URLs
          }
        }
      }

      // If no products were found, let the user know explicitly
      if (products.length === 0) {
        await ctx.reply(
          "🔍 I analyzed the image but couldn't find exact matches in our current catalog. " +
          "Try describing what you're looking for in text and I'll search again!",
        );
      }
    } catch (error) {
      console.error("Photo analysis error:", error);
      await ctx.reply(
        "😅 I had trouble analyzing that image. Could you try sending it again, or describe what you're looking for instead?"
      );
    }
  });

  // ── Location handler — Save delivery coordinates ───────────────────────
  bot.on(message("location"), async (ctx) => {
    const { latitude, longitude } = ctx.message.location;
    await withTyping(ctx, "typing", async () => {
      try {
        await updateUserLocation(String(ctx.from.id), latitude, longitude);
        await ctx.reply(
          "📍 *Location Saved!*\n\nI've updated your profile with your delivery coordinates. This helps me find suppliers closer to you! 🚚",
          { parse_mode: "Markdown" }
        );
      } catch (error) {
        console.error("Location save error:", error);
        await ctx.reply("😅 I couldn't save your location profile. Please try again later.");
      }
    });
  });

  // ── Inline button handler — "🛒 Order This" ───────────────────────────
  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as any).data as string;
    if (!data?.startsWith("order:")) return;

    const productId = data.replace("order:", "");
    const telegramId = String(ctx.from.id);

    // Acknowledge the button tap immediately
    await ctx.answerCbQuery("Starting your order... 🛍️");

    // Validate product
    const { prisma } = await import("@/lib/prisma");
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { supplier: { select: { businessName: true, supplierType: true } } },
    });

    if (!product || !product.isApproved || !product.isActive || product.stock < 1) {
      await ctx.reply("❌ Sorry, that product is no longer available.");
      return;
    }

    const delivery = product.supplier.supplierType === "LOCAL" ? "2-3 business days" : "14-21 business days";

    // Start checkout flow
    checkoutState.set(telegramId, { productId, step: "phone" });

    await ctx.reply(
      `🛍️ *${product.name}*\n` +
      `💰 ₦${Number(product.sellingPrice).toLocaleString()}\n` +
      `🏪 ${product.supplier.businessName}\n` +
      `🚚 Delivery: ${delivery}\n\n` +
      `📱 *What's your phone number?*\n_(e.g. 08012345678)_`,
      { parse_mode: "Markdown" }
    );
  });

  // ── Text message handler — Main AI chat with product search ────────────
  bot.on(message("text"), async (ctx) => {
    const userMessage = ctx.message.text;
    const telegramId = String(ctx.from.id);

    // ── Checkout state machine ─────────────────────────────────────────
    // Pending checkout: { productId, step: 'phone'|'address'|'confirm' }
    const pending = checkoutState.get(telegramId);

    if (pending) {
      if (pending.step === "phone") {
        // Validate Nigerian phone number
        const phone = userMessage.trim().replace(/\s/g, "");
        if (!/^(\+234|0)[789][01]\d{8}$/.test(phone)) {
          await ctx.reply(
            "❌ That doesn't look like a valid Nigerian phone number.\n\nPlease enter your phone number (e.g. 08012345678 or +2348012345678):"
          );
          return;
        }
        checkoutState.set(telegramId, { ...pending, phone, step: "address" });
        await ctx.reply(
          "📍 *Delivery Address*\n\nPlease type your full delivery address:\n\n_Example: 12 Awka Road, Onitsha, Anambra_",
          { parse_mode: "Markdown" }
        );
        return;
      }

      if (pending.step === "address") {
        const address = userMessage.trim();
        if (address.length < 10) {
          await ctx.reply("Please enter a more complete address (street, city, state):");
          return;
        }
        checkoutState.set(telegramId, { ...pending, address, step: "confirm" });

        // Show order summary for confirmation
        const { prisma } = await import("@/lib/prisma");
        const product = await prisma.product.findUnique({
          where: { id: pending.productId },
          include: { supplier: { select: { businessName: true } } },
        });

        if (!product) {
          checkoutState.delete(telegramId);
          await ctx.reply("❌ Sorry, that product is no longer available.");
          return;
        }

        await ctx.reply(
          `📋 *Order Summary*\n\n` +
          `🛍️ *${product.name}*\n` +
          `💰 ₦${Number(product.sellingPrice).toLocaleString()}\n` +
          `🏪 ${product.supplier.businessName}\n` +
          `📱 Phone: ${pending.phone}\n` +
          `📍 Deliver to: ${address}\n\n` +
          `Reply *YES* to confirm and get your payment link, or *NO* to cancel.`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      if (pending.step === "confirm") {
        const answer = userMessage.trim().toUpperCase();

        if (answer === "NO" || answer === "CANCEL") {
          checkoutState.delete(telegramId);
          await ctx.reply("❌ Order cancelled. No worries — just tell me what you're looking for! 😊");
          return;
        }

        if (answer === "YES" || answer === "CONFIRM" || answer === "Y") {
          checkoutState.delete(telegramId);
          await ctx.reply("⏳ Creating your order and generating payment link...");

          try {
            const order = await createOrder(
              telegramId,
              pending.productId,
              pending.phone,
              pending.address
            );

            // Generate Flutterwave payment link
            const paymentLink = await generatePaymentLink(order.id);

            const productName = (order as any).items[0]?.product?.name ?? "Item";
            await ctx.reply(
              `✅ *Order Created!*\n\n` +
              `Order: *#${(order as any).orderNumber}*\n` +
              `Item: *${productName}*\n` +
              `Total: *₦${Number(order.totalAmount).toLocaleString()}*\n\n` +
              `💳 *Tap below to pay securely:*\n${paymentLink}\n\n` +
              `⏰ Payment link expires in 30 minutes.\n` +
              `Type /orders to track your order after payment.`,
              { parse_mode: "Markdown" }
            );
          } catch (err: any) {
            console.error("Order/payment error:", err);
            await ctx.reply(
              `❌ Sorry, something went wrong: ${err.message}\n\nPlease try again or contact support.`
            );
          }
          return;
        }

        // Unrecognised response
        await ctx.reply("Please reply *YES* to confirm or *NO* to cancel.", { parse_mode: "Markdown" });
        return;
      }
    }

    // ── Regular AI chat ────────────────────────────────────────────────
    try {
      await withTyping(ctx, "typing", async () => {
        const user = await getOrCreateUser(telegramId, ctx.from.first_name, ctx.from.last_name);
        const profile = formatUserProfileForAI(user);

        // Fast heuristic: skip AI query extraction for obvious non-product messages
        const lowerMsg = userMessage.toLowerCase();
        const isLikelyProductQuery = /\b(show|find|want|need|looking|buy|order|price|cheap|sneaker|shoe|shirt|dress|bag|trouser|jean|jacket|cap|watch|ring|necklace|ankara|agbada|kaftan|under|below|above|₦|naira)\b/.test(lowerMsg);

        let products: any[] = [];
        if (isLikelyProductQuery) {
          products = await searchProducts(userMessage, 5);
        }

        const catalog = formatProductsForAI(products);
        const extraContext = `${catalog}\n\n${profile}`;

        const reply = await chatWithAI(telegramId, userMessage, extraContext);
        console.log(`[Bot] Reply for ${telegramId}: ${reply.substring(0, 80)}...`);

        await ctx.reply(truncate(sanitizeMarkdown(reply)), { parse_mode: "Markdown" });

        // Send first product image if products found
        if (products.length > 0 && products[0].imageUrls[0] && isLikelyProductQuery) {
          try {
            await ctx.replyWithPhoto(products[0].imageUrls[0], {
              caption: `*${products[0].name}*\n₦${Number(products[0].sellingPrice).toLocaleString()}`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[
                  { text: "🛒 Order This", callback_data: `order:${products[0].id}` }
                ]]
              }
            });
          } catch { /* skip invalid URLs */ }
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      try {
        await ctx.reply("😅 Oops, something went wrong. Try again in a moment!");
      } catch { /* ignore */ }
    }
  });

  // Store singleton
  if (process.env.NODE_ENV !== "production") {
    globalForBot.veeBot = bot;
  }

  return bot;
}

// ─── Keyword Extraction Helper ───────────────────────────────────────────────

/**
 * Extract meaningful search keywords from a Groq vision analysis.
 *
 * Three-strategy approach:
 * 1. Parse the explicit "Keywords:" line Groq was asked to provide
 * 2. Scan the paragraph for known fashion terms
 * 3. Fall back to the first sentence cleaned of stop words
 */
function extractSearchKeywords(analysis: string): string {
  // ── Strategy 1: Parse the structured keywords Groq was asked to provide ──
  // GROQ_VISION_PROMPT asks for "3-5 search keywords" — Groq often ends with:
  // "Keywords: sneakers, black, leather, casual" or "Search keywords: ..."
  const keywordLineMatch = analysis.match(
    /(?:keywords?|search terms?|tags?)[:\s]+([^\n.]+)/i
  );
  if (keywordLineMatch) {
    const keywords = keywordLineMatch[1]
      .split(/[,;]+/)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 1 && k.length < 30)
      .slice(0, 6);
    if (keywords.length >= 2) {
      console.log(`[Keywords] Parsed from Groq structured output: ${keywords.join(", ")}`);
      return keywords.join(" ");
    }
  }

  // ── Strategy 2: Scan for known fashion terms ──────────────────────────────
  const fashionTerms = [
    "sneakers", "sneaker", "shoes", "shoe", "boot", "boots", "sandal", "sandals",
    "heels", "heel", "loafers", "slides", "flip-flops", "slippers",
    "shirt", "t-shirt", "tshirt", "polo", "blouse", "top", "tank",
    "dress", "gown", "skirt", "jumpsuit",
    "jeans", "trousers", "pants", "shorts", "joggers", "chinos",
    "jacket", "hoodie", "sweater", "cardigan", "blazer", "coat",
    "bag", "handbag", "backpack", "clutch", "purse", "tote",
    "watch", "watches", "bracelet", "necklace", "earring", "ring", "jewelry",
    "cap", "hat", "beanie", "scarf",
    "belt", "sunglasses", "glasses",
    "ankara", "agbada", "dashiki", "kaftan",
    // Colors
    "black", "white", "red", "blue", "green", "yellow", "pink", "purple",
    "brown", "grey", "gray", "navy", "beige", "gold", "silver", "orange",
    "cream", "burgundy", "maroon", "teal", "coral",
    // Styles
    "casual", "formal", "streetwear", "sporty", "vintage", "classic",
    "traditional", "modern", "elegant", "athletic",
    // Materials
    "leather", "suede", "canvas", "denim", "silk", "cotton", "lace",
  ];

  const analysisLower = analysis.toLowerCase();
  const foundTerms: string[] = [];

  for (const term of fashionTerms) {
    if (analysisLower.includes(term) && !foundTerms.includes(term)) {
      foundTerms.push(term);
    }
  }

  if (foundTerms.length > 0) {
    const searchString = foundTerms.slice(0, 6).join(" ");
    console.log(`[Keywords] Extracted ${foundTerms.length} fashion terms: ${searchString}`);
    return searchString;
  }

  // ── Strategy 3: First sentence, stop-words removed ────────────────────────
  const firstSentence = analysis.split(/[.!?]/)[0]?.trim() || analysis;
  const cleaned = firstSentence
    .replace(/\b(the|this|is|a|an|it|has|with|and|or|in|on|for|of|to|are|was|were|been|being|have|that|from|which|very|also|its|these|those|can|will|may|just|more|most|some|any|all|each|both|few|other|such|than|too|only|same|into|over|after|about|out|up|down|one|two|three|four|five|image|shows|appears|features|looks|seems|photo|picture)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || analysis.substring(0, 50);
}

export const bot = createBot();
