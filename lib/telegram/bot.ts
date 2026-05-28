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
  getLatestProducts,
  formatProductsForAI,
  getOrCreateUser,
  updateUserSizes,
  formatUserProfileForAI,
  getUserOrders,
  createOrder,
  updateUserLocation
} from "./services";

// ─── Environment Variables ───────────────────────────────────────────────────

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
const GROQ_KEY = (process.env.GROQ_API ?? process.env.GROQ_API_KEY ?? "").trim();
const HF_KEY = (process.env.HF_API_KEY || process.env.HUGGING_FACE_API || "").trim();
const OLLAMA_URL = (process.env.OLLAMA_URL || "https://ollama.com").replace(/\/v1.*$/, "");
const OLLAMA_KEY = process.env.OLLAMA_API_KEY || "";
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || "").trim();

if (!TELEGRAM_TOKEN) console.error("⚠️  Missing TELEGRAM_BOT_TOKEN in .env");

// ─── Ollama Dynamic Model Selection ─────────────────────────────────────────

let ollamaModelName: string | null = null;
let ollamaModelFetched = false;

/**
 * Fetch available models from the Ollama instance and pick the best one.
 * Caches the result so we only fetch once per cold start.
 */
async function getOllamaModel(): Promise<string> {
  if (ollamaModelFetched && ollamaModelName) return ollamaModelName;

  try {
    const ollama = new Ollama({
      host: OLLAMA_URL,
      headers: OLLAMA_KEY ? { Authorization: `Bearer ${OLLAMA_KEY}` } : {},
    });

    const listResult = await ollama.list();
    const models = (listResult.models || [])
      .map((m: any) => (m.name || "").trim())
      .filter((name: string) => name.length > 0); // Sanitize: remove empty strings

    if (models.length > 0) {
      // Prefer llama models, then any available model
      const preferred = models.find((m: string) =>
        m.toLowerCase().includes("llama")
      );
      ollamaModelName = preferred || models[0];
      console.log(`[Ollama] Selected model: ${ollamaModelName} (from ${models.length} available: ${models.join(", ")})`);
    } else {
      console.warn("[Ollama] No models found on the instance. Will use fallback.");
      ollamaModelName = "llama3"; // Default guess
    }
  } catch (error: any) {
    console.warn(`[Ollama] Failed to fetch models: ${error.message}. Using default "llama3".`);
    ollamaModelName = "llama3";
  }

  ollamaModelFetched = true;
  return ollamaModelName;
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
  // Build context-enriched user message
  const contextualMessage = extraContext
    ? `${userMessage}\n\n${extraContext}`
    : userMessage;

  // Push user message to history (without the context blob)
  pushHistory(telegramId, { role: "user", content: userMessage });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: VEE_AI_SYSTEM_PROMPT },
    ...getHistory(telegramId).slice(0, -1), // history minus the one we just pushed
    { role: "user", content: contextualMessage }, // the enriched version
  ];

  let reply = "";

  // ── Primary: Ollama ───────────────────────────────────────────────────
  try {
    const modelName = await getOllamaModel();
    console.log(`[Ollama] Sending chat to model: ${modelName}`);

    const ollamaClient = new Ollama({
      host: OLLAMA_URL,
      headers: OLLAMA_KEY ? { Authorization: `Bearer ${OLLAMA_KEY}` } : {},
    });

    const response = await ollamaClient.chat({
      messages: messages as any[],
      model: modelName,
    });

    reply = sanitizeAIResponse(response.message?.content);
    if (reply) {
      console.log(`[Ollama] ✅ Got response (${reply.length} chars) from ${modelName}`);
    } else {
      console.warn(`[Ollama] ⚠️ Empty response from ${modelName}, falling back...`);
      throw new Error("Ollama returned empty response");
    }
  } catch (ollamaError: any) {
    console.warn(`⚠️ Ollama failed: ${ollamaError.message}. Falling back to OpenRouter...`);

    // ── Fallback: OpenRouter ──────────────────────────────────────────
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
        console.log(`[OpenRouter] ✅ Fallback response (${reply.length} chars), model: ${completion.model}`);
      } else {
        console.warn("[OpenRouter] ⚠️ Empty response from fallback");
      }
    } catch (orError: any) {
      console.error("❌ Both Ollama and OpenRouter failed:", orError.message);
    }
  }

  if (!reply) {
    reply = "Sorry, I couldn't process that right now. Both AI services are a bit busy — please try again in a moment! 🙏";
  }

  // Save assistant reply to history
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
      model: "llama-3.2-90b-vision-preview",
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
          await ctx.replyWithPhoto(products[0].imageUrls[0]);
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

      // Step 3: Search for matching products using the extracted keywords
      const products = await searchProducts(searchKeywords, 5);
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

      // Send matching product images
      for (const product of products.slice(0, 3)) {
        if (product.imageUrls[0]) {
          try {
            await ctx.replyWithPhoto(product.imageUrls[0], {
              caption: `${product.name} — ₦${Number(product.sellingPrice).toLocaleString()}`,
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

  // ── Text message handler — Main AI chat with product search ────────────
  bot.on(message("text"), async (ctx) => {
    const userMessage = ctx.message.text;
    const telegramId = String(ctx.from.id);

    // Detect "Order [ID] [Phone] [Address]" or variations
    const orderMatch = userMessage.match(/(?:order|buy|get)\s+([a-z0-9-]{20,})(?:\s+([\d+]{10,}))?(?:\s+(?:at|to|address)\s+(.+))?/i);
    const idOnlyMatch = !orderMatch && userMessage.length > 20 && userMessage.match(/^[a-z0-9-]{20,}$/i);

    if (orderMatch || idOnlyMatch) {
      const productId = orderMatch ? orderMatch[1] : userMessage.trim();
      const phone = orderMatch?.[2];
      const address = orderMatch?.[3];

      if (!phone || !address) {
        await ctx.reply(
          "📦 *Almost there!* To process your order, I need your phone number and delivery address.\n\n" +
          "Please reply in this format:\n" +
          `\`order ${productId} [phone] at [address]\`\n\n` +
          "Example:\n" +
          `\`order ${productId} 08012345678 at 123 Awka Road, Onitsha\``,
          { parse_mode: "Markdown" }
        );
        return;
      }

      try {
        await ctx.reply("⏳ Processing your order request...");
        const order = await createOrder(telegramId, productId, phone, address);
        
        const successMsg = `✅ *Order Placed Successfully!*

Order ID: \`${order.id}\`
Item: *${(order as any).items[0].product.name}*
Total: *₦${Number(order.totalAmount).toLocaleString()}*
Phone: *${phone}*
Delivery to: *${address}*

What happens next?
1. Our team will verify the availability with the supplier.
2. You will receive a payment link here shortly.
3. Type /orders to track your status.

Thanks for shopping with Vendo! 🛍️`;

        await ctx.reply(successMsg, { parse_mode: "Markdown" });
        return;
      } catch (err: any) {
        console.error("Order creation failed:", err);
        await ctx.reply("❌ Sorry, I couldn't process that order. The Product ID might be incorrect or the item is out of stock.");
        return;
      }
    }

    try {
      await withTyping(ctx, "typing", async () => {
        // Get or create user
        const user = await getOrCreateUser(
          telegramId,
          ctx.from.first_name,
          ctx.from.last_name
        );
        const profile = formatUserProfileForAI(user);

        // Search products based on the user's message
        const products = await searchProducts(userMessage, 5);
        const catalog = formatProductsForAI(products);

        // Build context
        const extraContext = `${catalog}\n\n${profile}`;

        // Get AI response (Ollama primary → OpenRouter fallback)
        const reply = await chatWithAI(telegramId, userMessage, extraContext);
        console.log(`[Bot] Final reply from AI for user ${telegramId}: ${reply.substring(0, 100)}...`);

        await ctx.reply(truncate(sanitizeMarkdown(reply)), { parse_mode: "Markdown" });
        console.log(`[Bot] Message sent to Telegram for user ${telegramId}`);

        // If products were found and the message seems like a product query,
        // send the first product image
        if (products.length > 0 && products[0].imageUrls[0]) {
          const searchTerms = ["show", "find", "want", "need", "looking", "shoe", "shirt", "dress", "sneaker", "bag", "watch", "cap"];
          const isProductQuery = searchTerms.some((term) =>
            userMessage.toLowerCase().includes(term)
          );

          if (isProductQuery) {
            try {
              await ctx.replyWithPhoto(products[0].imageUrls[0], {
                caption: `${products[0].name} — ₦${Number(products[0].sellingPrice).toLocaleString()}`,
              });
            } catch {
              // Skip invalid image URLs
            }
          }
        }
      });
    } catch (error) {
      console.error("Chat error:", error);
      // Attempt to send a fallback message even if the primary reply failed
      try {
        await ctx.reply(
          "😅 Oops, something went wrong on my end. Try again in a moment! (Error logged)"
        );
      } catch (fallbackReplyError) {
        console.error("❌ Failed to send fallback error message:", fallbackReplyError);
      }
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
 * Extract meaningful search keywords from a vision analysis paragraph.
 * The Groq vision model returns a descriptive paragraph — we need to pull out
 * the product-relevant terms for database search.
 */
function extractSearchKeywords(analysis: string): string {
  // Common fashion keywords to prioritize
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

  // Extract matching fashion terms from the analysis
  for (const term of fashionTerms) {
    if (analysisLower.includes(term) && !foundTerms.includes(term)) {
      foundTerms.push(term);
    }
  }

  // If we found fashion terms, join them into a search string
  if (foundTerms.length > 0) {
    // Limit to 6 most relevant terms to keep search focused
    const searchString = foundTerms.slice(0, 6).join(" ");
    console.log(`[Keywords] Extracted ${foundTerms.length} terms: ${searchString}`);
    return searchString;
  }

  // Fallback: use the first sentence of the analysis as a search query
  const firstSentence = analysis.split(/[.!?]/)[0]?.trim() || analysis;
  // Remove common non-searchable words
  const cleaned = firstSentence
    .replace(/\b(the|this|is|a|an|it|has|with|and|or|in|on|for|of|to|are|was|were|been|being|have|that|from|which|very|also|its|these|those|can|will|may|just|more|most|some|any|all|each|both|few|other|such|than|too|only|same|into|over|after|about|out|up|down|one|two|three|four|five|image|shows|appears|features|looks|seems|photo|picture|appears)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || analysis.substring(0, 50);
}

export const bot = createBot();
