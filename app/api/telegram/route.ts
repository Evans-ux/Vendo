// app/api/telegram/route.ts
import { Telegraf, Context } from "telegraf";
import { NextResponse } from "next/server";
// import Groq from "groq"; // removed - use HTTP proxy to Groq API instead
import { GoogleGenerativeAI } from "@google/generative-ai";
import { HfInference } from "@huggingface/inference";

// ═══════════════════════════════════════════════════════════════════════════
// VENDO AI BOT - Telegram Integration with AI-Powered Supplier Selection
// Purpose: Fashion AI assistant for Vendo e-commerce platform
// ═══════════════════════════════════════════════════════════════════════════
//# set webhook to your deployed domain
//curl -X GET "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=https://YOUR_DOMAIN/api/telegram"
// Initialize AI Services
const GROQ_API_KEY = process.env.GROQ_API_KEY ?? "";
const GROQ_API_BASE = process.env.GROQ_API_BASE ?? "https://api.groq.ai";
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY ?? process.env.OLLAMA_API ?? process.env.OLLAMA_API_KEY_TEST ?? "";
const OLLAMA_API_URL = process.env.OLLAMA_API_URL ?? "https://api.ollama.com";

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");
const hf = new HfInference(process.env.HF_API_KEY ?? "");

// Initialize Telegram Bot
const telegramToken = process.env.TELEGRAM_BOT_TOKEN;
if (!telegramToken) {
  throw new Error("Missing TELEGRAM_BOT_TOKEN in env");
}
const bot = new Telegraf(telegramToken);

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://vendo-nu.vercel.app";

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

const VENDO_SYSTEM_PROMPT = `You are Vendo AI, a friendly Nigerian fashion assistant helping customers find amazing outfits.

PERSONALITY:
- Warm, helpful, and knowledgeable about fashion
- Use casual Nigerian English (mix of English and local expressions)
- Recommend sizes and matching outfits
- Always mention prices in Nigerian Naira (₦)

YOUR RESPONSIBILITIES:
1. Answer fashion questions and style advice
2. Help customers find products by searching our supplier network
3. Recommend size based on customer profile
4. Suggest matching outfits and accessories
5. Handle orders with smart supplier selection
6. Collect user location for better recommendations

SEARCH PROCESS:
When user asks "find me a black shoe within 56k range":
1. Call /api/users/create to create user if new (pass telegramId)
2. Ask for location if you don't have it: "Where are you located in Nigeria? (State/City)"
3. Call /api/suppliers/verified to get all verified suppliers and products
4. ANALYZE suppliers based on:
   - ✅ KYC APPROVED status (must have this)
   - ✅ Onboarding COMPLETED (critical)
   - ✅ Has the exact product user wants
   - ✅ Description match (closest match to user's request)
   - ✅ Location proximity (if user location known, prefer LOCAL suppliers in same state)
   - ✅ Success rate (prefer 80%+ delivery success)
   - ✅ Price range (matches user budget)
5. SELECTION LOGIC:
   - First choice: Has all requirements
   - Second choice: Missing only location (if they have best product match)
   - Third choice: Nearest match on most critical criteria
   - Always pick from verified (KYC=APPROVED + isActive=true)
   - If no one has exact product, find closest category match

SUPPLIER CRITERIA PRIORITY (1=highest):
1. KYC Status (APPROVED only - CRITICAL)
2. Active Status (isActive=true - CRITICAL)
3. Has product in stock (CRITICAL)
4. Description match with user request (HIGH)
5. Price within range (HIGH)
6. Location proximity - if user gave location (MEDIUM)
7. Delivery success rate >80% (MEDIUM)
8. Onboarding completion (MEDIUM)

IMPORTANT RULES:
- NEVER suggest unverified suppliers
- Always show: Price (₦), Description, Supplier name, Delivery time (2-3 days LOCAL, 14-21 days DROPSHIP)
- Ask follow-up questions if user request is unclear
- Remember user's location, size preferences across conversation
- Guide through full purchase process smoothly

APIS YOU CAN CALL:
- POST /api/users/create (when meeting new user)
- GET /api/suppliers/verified (to fetch all verified suppliers + products)
- POST /api/users/location (save user location after they share it)
- POST /api/telegram/conversation (save context for later)
- GET /api/telegram/conversation (get user history)

When suggesting products, format like:
🛍️ **Black Leather Shoe**
💰 ₦45,000 (was ₦36,000)
📏 Sizes: 40-46
🏪 By Fashionable Stores (4.8⭐)
⏱️ Delivery: 2-3 days (LOCAL)
📦 Stock: 8 available`;


const IMAGE_INTERPRETATION_PROMPT = `You are an expert fashion analyst. 
Analyze the image provided and describe:
1. What type of clothing/style is shown
2. Color scheme and materials
3. Occasion suitable for
4. Styling tips
5. Similar products we might have

Be concise but detailed. Help the customer find matching items.`;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

async function ensureUserExists(telegramId: string, username?: string): Promise<string | null> {
  try {
    const response = await fetch(`${SITE_URL}/api/users/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId,
        telegramUsername: username,
        name: username || `User_${telegramId}`,
      }),
    });
    const data = await response.json();
    return data.userId;
  } catch (error) {
    console.error("User creation error:", error);
    return null;
  }
}

async function getVerifiedSuppliers() {
  try {
    const response = await fetch(`${SITE_URL}/api/suppliers/verified`, {
      method: "GET",
    });
    const data = await response.json();
    return data.suppliers || [];
  } catch (error) {
    console.error("Fetch suppliers error:", error);
    return [];
  }
}

async function saveLocation(telegramId: string, lat: number, lng: number, state: string) {
  try {
    await fetch(`${SITE_URL}/api/users/location`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, lat, lng, state }),
    });
  } catch (error) {
    console.error("Location save error:", error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GROQ - Main Chat with Supplier Selection Logic (HTTP proxy implementation)
// ═══════════════════════════════════════════════════════════════════════════

async function callGroqAPI(payload: Record<string, any>) {
  try {
    const res = await fetch(`${GROQ_API_BASE}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("Groq API error:", res.status, text);
      return null;
    }
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("callGroqAPI error:", e);
    return null;
  }
}

// Try Ollama first (if configured). If it fails, caller should fallback to Groq.
async function callOllamaAPI(payload: Record<string, any>) {
  if (!OLLAMA_API_KEY) return null;
  const base = OLLAMA_API_URL.replace(/\/$/, "");
  const url = `${base}/v1/chat/completions`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      console.warn("Ollama API non-ok response:", res.status, txt);
      return null;
    }
    const json = await res.json();
    return json;
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.warn("Ollama API request failed:", e.message ?? e);
    return null;
  }
}

// High-level AI chat wrapper: prefer Ollama, fallback to Groq
async function aiChat(userMessage: string, context: Record<string, any> = {}): Promise<string> {
  // Build payload similar to Groq
  const contextString = `\nUSER CONTEXT:\n- Telegram ID: ${context.telegramId}\n- Location: ${context.location ? `${context.location.state}, ${context.location.city}` : "Unknown (ask for it)"}\n- Shoe Size: ${context.shoeSize || "Unknown"}\n- Shirt Size: ${context.shirtSize || "Unknown"}\n`;
  const payload: any = {
    model: "mixtral-8x7b-32768",
    messages: [
      { role: "system", content: VENDO_SYSTEM_PROMPT + "\n" + contextString },
      { role: "user", content: userMessage },
    ],
    temperature: 0.7,
    max_tokens: 1024,
  };

  // Try Ollama first
  const ollamaResp = await callOllamaAPI(payload);
  const ollamaContent = ollamaResp?.choices?.[0]?.message?.content ?? ollamaResp?.choices?.[0]?.text ?? null;
  if (ollamaContent) {
    console.log("aiChat: responded from Ollama");
    return ollamaContent;
  }

  // Fallback to Groq
  try {
    const groqResp = await groqChat(userMessage, context);
    console.log("aiChat: responded from Groq fallback");
    return groqResp;
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error("aiChat: both Ollama and Groq failed", e);
    return "I'm having trouble thinking right now. Please try again in a moment.";
  }
}

async function groqChat(userMessage: string, context: Record<string, any> = {}): Promise<string> {
  try {
    // Build context for AI
    const contextString = `
USER CONTEXT:
- Telegram ID: ${context.telegramId}
- Location: ${context.location ? `${context.location.state}, ${context.location.city}` : "Unknown (ask for it)"}
- Shoe Size: ${context.shoeSize || "Unknown"}
- Shirt Size: ${context.shirtSize || "Unknown"}
${context.availableSuppliers ? `
AVAILABLE VERIFIED SUPPLIERS DATA:
${JSON.stringify(context.availableSuppliers.slice(0, 5), null, 2)}
(${context.availableSuppliers.length} total suppliers available)` : "" }
`;

    const payload: any = {
      model: "mixtral-8x7b-32768",
      messages: [
        {
          role: "system",
          content: VENDO_SYSTEM_PROMPT + "\n" + contextString,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    };

    const apiResp = await callGroqAPI(payload);
    const content =
      apiResp?.choices?.[0]?.message?.content ??
      apiResp?.choices?.[0]?.text ??
      null;

    return content ?? "Sorry, I couldn't process that. Please try again.";
  } catch (error) {
    console.error("Groq error:", error);
    return "I'm having trouble thinking right now. Please try again in a moment.";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GEMINI - Image Interpretation (Fashion Analysis)
// ═══════════════════════════════════════════════════════════════════════════

async function geminiImageAnalysis(imageUrl: string): Promise<string> {
  try {
    const model = gemini.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Fetch image and convert to base64
    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const result = await model.generateContent([
      IMAGE_INTERPRETATION_PROMPT,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: base64,
        },
      },
    ]);

    // result.response may vary by SDK; best-effort extraction:
    return (result as any)?.response?.text?.() ?? (result as any)?.text ?? "Could not analyze the image. Please try another.";
  } catch (error) {
    console.error("Gemini error:", error);
    return "I couldn't analyze that image. Please share a clearer photo and I'll help!";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// HUGGING FACE - Image Generation (Outfit Visualization)
// ═══════════════════════════════════════════════════════════════════════════

async function generateOutfitImage(outfitDescription: string): Promise<string | null> {
  try {
    const prompt = `A fashionable Nigerian person wearing: ${outfitDescription}. 
    Studio lighting, professional fashion photography, high quality, 4K resolution.`;

    const blob = await hf.textToImage({
      model: "stabilityai/stable-diffusion-3.5-large",
      inputs: prompt,
    });

    // Convert blob to base64 (handle Blob-like or URL string return types)
    let arrayBuffer: ArrayBuffer;
    if (typeof blob === "string") {
      const resp = await fetch(blob);
      arrayBuffer = await resp.arrayBuffer();
    } else if (blob && typeof (blob as any).arrayBuffer === "function") {
      arrayBuffer = await (blob as any).arrayBuffer();
    } else {
      return null;
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/jpeg;base64,${base64}`;
  } catch (error) {
    console.error("HuggingFace image generation error:", error);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BOT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

// Start command
bot.start(async (ctx: Context) => {
  const telegramId = ctx.from?.id.toString();
  const username = ctx.from?.username;

  // Create user if new
  if (telegramId) {
    await ensureUserExists(telegramId, username);
  }

  await ctx.reply(
    `👋 Welcome to Vendo AI!\n\nI'm your personal fashion assistant. I can help you:\n\n` +
      `🛍️ Find the perfect outfit at great prices\n` +
      `📸 Analyze clothing photos\n` +
      `👗 Get size recommendations\n` +
      `💳 Place orders with verified sellers\n\n` +
      `Just tell me what you're looking for!\n\n` +
      `Example: "Find me a black shoe within 50k-60k range"\n` +
      `Or: "Show me white sneakers"\n\n` +
      `*To place an order:* Reply with "order [product_id] [size] [quantity]"\n` +
      `Example: order abc123def456 42 1`,
    { parse_mode: "Markdown" }
  );
});

// Help command
bot.help(async (ctx: Context) => {
  await ctx.reply(
    `*How to use Vendo AI*\n\n` +
      `📝 *Just ask what you want!*\n` +
      `"Find me black shoes within 56k"\n` +
      `"Show me summer dresses"\n` +
      `"What sneakers match this shirt?"\n\n` +
      `📸 *Share a photo*\n` +
      `Send an outfit photo and I'll analyze it\n\n` +
      `📍 *Share your location*\n` +
      `For faster delivery recommendations\n\n` +
      `🛒 *Place an order*\n` +
      `order [product_id] [size] [quantity]\n` +
      `Example: order abc123 42 1\n\n` +
      `📋 *Check orders*\n` +
      `Reply with "my orders" to see your orders`,
    { parse_mode: "Markdown" }
  );
});

// Text handler - Main search and interaction
bot.on("text", async (ctx: Context) => {
  const userMessage = (ctx.message as any)?.text;
  const telegramId = ctx.from?.id.toString();

  if (!userMessage || !telegramId) return;

  // Ignore commands
  if (userMessage.startsWith("/")) return;

  try {
    await ctx.sendChatAction("typing");

    // Ensure user exists
    await ensureUserExists(telegramId, ctx.from?.username);

    // Handle order placement
    if (userMessage.toLowerCase().startsWith("order ")) {
      const parts = userMessage.slice(6).trim().split(/\s+/);
      const productId = parts[0];
      const size = parts[1];
      const quantity = parseInt(parts[2]) || 1;

      if (!productId || !size) {
        await ctx.reply(
          `❌ Invalid order format!\n\n` +
            `Use: order [product_id] [size] [quantity]\n` +
            `Example: order abc123def456 42 1`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      // Call order API
      const orderResponse = await fetch(`${SITE_URL}/api/orders/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId,
          productId,
          quantity,
          size,
          name: (ctx.from as any)?.first_name,
          phone: (ctx.from as any)?.username,
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        await ctx.reply(
          `❌ Order failed: ${orderData.error}`,
          { parse_mode: "Markdown" }
        );
        return;
      }

      const o = orderData.order;
      const deliveryType = o.supplier.type === "LOCAL" ? "🚗 Local waybill" : "📦 CJ Dropshipping";
      
      await ctx.reply(
        `✅ *Order Created Successfully!*\n\n` +
        `📦 Product: ${o.productName}\n` +
        `💰 Total: ₦${o.totalAmount.toLocaleString()}\n` +
        `📏 Size: ${o.size}\n` +
        `Qty: ${o.quantity}x\n` +
        `🚚 ${deliveryType}\n` +
        `⏱️ ETA: ${o.supplier.type === "LOCAL" ? "2-3 days" : "14-21 days"}\n\n` +
        `Order ID: \`${o.id}\`\n` +
        `Status: ${o.status}\n\n` +
        `💳 Proceed to payment: /pay_${o.id}`,
        { parse_mode: "Markdown" }
      );
      return;
    }

    // Handle order history
    if (userMessage.toLowerCase() === "my orders") {
      const ordersResponse = await fetch(
        `${SITE_URL}/api/orders/create?telegramId=${telegramId}`,
        { method: "GET" }
      );
      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];

      if (orders.length === 0) {
        await ctx.reply("📭 You haven't placed any orders yet!");
        return;
      }

      let message = `📋 *Your Orders*\n\n`;
      orders.slice(0, 5).forEach((order: any, idx: number) => {
        message += `${idx + 1}. Order \`${order.id.slice(0, 8)}\`\n`;
        message += `   💰 ₦${order.totalAmount.toLocaleString()}\n`;
        message += `   Status: ${order.status}\n`;
        message += `   Payment: ${order.paymentStatus}\n\n`;
      });

      await ctx.reply(message, { parse_mode: "Markdown" });
      return;
    }

    // Get verified suppliers
    const suppliers = await getVerifiedSuppliers();

    // Get user session
    const session = (userSessions.get(telegramId) as any) || {};

    // Call AI with context
    const context = {
      telegramId,
      availableSuppliers: suppliers.slice(0, 5),
      location: session.location || null,
      shoeSize: session.shoeSize || null,
      shirtSize: session.shirtSize || null,
    };

      const response = await aiChat(userMessage, context);

    // Split long messages
    if (response.length > 4096) {
      const chunks = response.match(/[\s\S]{1,4096}/g) || [];
      for (const chunk of chunks) {
        await ctx.reply(chunk, { parse_mode: "Markdown" });
      }
    } else {
      await ctx.reply(response, { parse_mode: "Markdown" });
    }
  } catch (error) {
    console.error("Text handler error:", error);
    await ctx.reply("Sorry, I encountered an issue. Please try again.");
  }
});

// Photo handler - for image analysis
bot.on("photo", async (ctx: Context) => {
  const telegramId = ctx.from?.id.toString();
  if (!telegramId) return;

  await ctx.sendChatAction("typing");

  try {
    const photo = (ctx.message as any)?.photo?.[(ctx.message as any).photo?.length - 1];
    if (!photo) {
      await ctx.reply("Could not process the image. Please try again.");
      return;
    }

    const fileId = photo.file_id;
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${telegramToken}/${(file as any).file_path}`;

    // Analyze with Gemini
    const analysis = await geminiImageAnalysis(fileUrl);
    await ctx.reply(`*Fashion Analysis:*\n\n${analysis}`, { parse_mode: "Markdown" });

    // Offer to find similar products
    await ctx.reply("Would you like me to find similar products in our store? Just describe what you're looking for!");
  } catch (error) {
    console.error("Photo analysis error:", error);
    await ctx.reply("Hmm, I had trouble analyzing that photo. Please try another! 📸");
  }
});

// Location handler - for delivery optimization
bot.on("location", async (ctx: Context) => {
  const telegramId = ctx.from?.id.toString();
  const location = (ctx.message as any)?.location;

  if (!telegramId || !location) return;

  try {
    // Save to session
    const session = (userSessions.get(telegramId) as any) || {};
    session.location = {
      lat: location.latitude,
      lng: location.longitude,
      state: "Nigeria",
    };
    userSessions.set(telegramId, session);

    // Save to database
    await saveLocation(telegramId, location.latitude, location.longitude, "Nigeria");

    await ctx.reply(
      `📍 Location saved! ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}\n\n` +
        `I'll use this to recommend sellers closest to you for faster delivery! 🚗`
    );
  } catch (error) {
    console.error("Location handler error:", error);
    await ctx.reply("Could not save location. Please try again.");
  }
});

// Contact handler - optional for phone number collection
bot.on("contact", async (ctx: Context) => {
  const telegramId = ctx.from?.id.toString();
  const contact = (ctx.message as any)?.contact;

  if (!telegramId || !contact) return;

  try {
    // Could save phone number here if needed
    await ctx.reply(`Thanks for sharing! I'll use ${contact.phone_number} for your orders.`);
  } catch (error) {
    console.error("Contact handler error:", error);
  }
});

// Error handler
bot.catch((err: unknown, ctx: any) => {
  const e = err instanceof Error ? err : new Error(String(err));
  console.error(`Error for ${ctx.updateType}:`, e);
  try {
    (ctx as any).reply && (ctx as any).reply("Oops! Something went wrong. Please try again.");
  } catch {}
});

// ═══════════════════════════════════════════════════════════════════════════
// NEXT.JS ROUTE HANDLER
// ═══════════════════════════════════════════════════════════════════════════

// Store minimal session data in memory (use Redis for production)
const userSessions = new Map<string, any>();

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Initialize session for user if needed
    if (payload.message) {
      const userId = payload.message.from?.id?.toString();
      if (userId && !userSessions.has(userId)) {
        userSessions.set(userId, {
          createdAt: Date.now(),
          location: null,
          shoeSize: null,
          shirtSize: null,
        });
      }
    }

    // Handle update with session middleware
    await (bot as any).handleUpdate(payload);
    return new Response("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

export const runtime = "nodejs";