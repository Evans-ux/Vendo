// lib/telegram/services.ts
// Database queries for the Vee AI Telegram bot
// Query intelligence uses Ollama (primary) → OpenRouter (fallback) — same as chat
// Groq is ONLY used for vision (image analysis)

import prisma from "@/lib/prisma";
import OpenAI from "openai";
import { GROQ_QUERY_EXTRACT_PROMPT } from "./prompts";

const OLLAMA_URL = (process.env.OLLAMA_URL || "https://ollama.com").replace(/\/+$/, "");
const OLLAMA_KEY = (process.env.OLLAMA_API_KEY || "").trim();
const OPENROUTER_KEY = (process.env.OPENROUTER_API_KEY || "").trim();
const OLLAMA_AVAILABLE = OLLAMA_KEY.length > 0;

// ─── AI-Powered Query Intelligence ───────────────────────────────────────────
// Uses Ollama Cloud (primary) → OpenRouter (fallback) to extract structured
// search params from natural language. No Groq — that's reserved for vision.

export interface SmartSearchParams {
  keywords: string[];
  category?: string | null;
  colors?: string[];
  sizes?: string[];
  maxPrice?: number | null;
  minPrice?: number;
  isProductQuery: boolean;
}

/**
 * Use Ollama/OpenRouter to intelligently extract structured search params
 * from any user message. Much smarter than naive keyword splitting.
 */
export async function extractSearchParams(
  userMessage: string
): Promise<SmartSearchParams> {
  // Simple fallback — used if both AI services fail
  const fallback: SmartSearchParams = {
    keywords: userMessage
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 5),
    isProductQuery: true,
  };

  const messages = [
    { role: "system" as const, content: GROQ_QUERY_EXTRACT_PROMPT },
    { role: "user" as const, content: userMessage },
  ];

  let raw = "";

  // ── Primary: Ollama Cloud ──────────────────────────────────────────────
  if (OLLAMA_AVAILABLE) {
    try {
      const ollamaClient = new OpenAI({
        baseURL: `${OLLAMA_URL}/v1`,
        apiKey: OLLAMA_KEY,
      });
      // Use a fast, free model for query extraction
      const completion = await ollamaClient.chat.completions.create({
        model: "gemma3:4b",
        messages,
        max_tokens: 200,
        temperature: 0.1,
      });
      raw = (completion.choices[0]?.message?.content || "").trim();
    } catch (err: any) {
      console.warn(`[Query Extract] Ollama failed: ${err.message}`);
    }
  }

  // ── Fallback: OpenRouter ───────────────────────────────────────────────
  if (!raw && OPENROUTER_KEY) {
    try {
      const orClient = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: OPENROUTER_KEY,
        defaultHeaders: { "HTTP-Referer": "https://vendo.ng", "X-Title": "Vendo Vee AI" },
      });
      const completion = await orClient.chat.completions.create({
        model: "openrouter/auto",
        messages,
        max_tokens: 200,
        temperature: 0.1,
      });
      raw = (completion.choices[0]?.message?.content || "").trim();
    } catch (err: any) {
      console.warn(`[Query Extract] OpenRouter failed: ${err.message}`);
    }
  }

  if (!raw) return fallback;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return fallback;
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((k: string) => k && k.length >= 2)
        : fallback.keywords,
      category: parsed.category || null,
      colors: Array.isArray(parsed.colors) ? parsed.colors : [],
      sizes: Array.isArray(parsed.sizes) ? parsed.sizes : [],
      maxPrice: typeof parsed.maxPrice === "number" ? parsed.maxPrice : null,
      minPrice: typeof parsed.minPrice === "number" ? parsed.minPrice : 0,
      isProductQuery: parsed.isProductQuery !== false,
    };
  } catch {
    return fallback;
  }
}

// ─── Smart Product Search ─────────────────────────────────────────────────────

/**
 * Search products using Groq-extracted structured params.
 * Much more accurate than naive keyword matching.
 */
export async function smartSearchProducts(
  params: SmartSearchParams,
  limit = 5
) {
  const { keywords, category, colors, sizes, maxPrice, minPrice = 0 } = params;

  // Combine keywords + colors as search terms (each is a single word)
  const allTerms = [...(keywords || []), ...(colors || [])].filter(
    (w) => w.length >= 2
  );

  if (allTerms.length === 0 && !category) {
    return getLatestProducts(limit);
  }

  const priceFilter =
    maxPrice != null
      ? { sellingPrice: { gte: minPrice, lte: maxPrice } }
      : minPrice > 0
      ? { sellingPrice: { gte: minPrice } }
      : {};

  const termFilter =
    allTerms.length > 0
      ? {
          OR: allTerms.flatMap((term) => [
            { name: { contains: term, mode: "insensitive" as const } },
            { description: { contains: term, mode: "insensitive" as const } },
            { category: { contains: term, mode: "insensitive" as const } },
          ]),
        }
      : {};

  const categoryFilter =
    category && category !== "null" && category !== "Other"
      ? { category: { contains: category, mode: "insensitive" as const } }
      : {};

  // ── Pass 1: approved + all filters ──────────────────────────────────────
  const pass1 = await prisma.product.findMany({
    where: {
      isApproved: true,
      isActive: true,
      stock: { gt: 0 },
      ...priceFilter,
      ...termFilter,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { businessName: true, supplierType: true } },
    },
  });
  if (pass1.length > 0) return pass1;

  // ── Pass 2: approved + category only (relax term filter) ────────────────
  if (category && category !== "null") {
    const pass2 = await prisma.product.findMany({
      where: {
        isApproved: true,
        isActive: true,
        stock: { gt: 0 },
        ...categoryFilter,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        supplier: { select: { businessName: true, supplierType: true } },
      },
    });
    if (pass2.length > 0) return pass2;
  }

  // ── Pass 3: include unapproved (so bot can acknowledge item exists) ──────
  const pass3 = await prisma.product.findMany({
    where: {
      isActive: true,
      ...termFilter,
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { businessName: true, supplierType: true } },
    },
  });
  return pass3;
}

/**
 * Main search entry point — uses Ollama/OpenRouter to understand the query, then searches DB.
 * For text messages: AI extracts intent → smart DB search
 * For vision: keywords already extracted by Groq vision → smart DB search
 */
export async function searchProducts(query: string, limit = 5) {
  const params = await extractSearchParams(query);

  if (!params.isProductQuery) {
    // Not a product query (greeting, general chat) — return empty
    return [];
  }

  return smartSearchProducts(params, limit);
}

/**
 * Search using pre-extracted params (used by photo handler after vision analysis)
 */
export async function searchProductsByParams(
  params: SmartSearchParams,
  limit = 5
) {
  return smartSearchProducts(params, limit);
}

// ─── Latest Products ──────────────────────────────────────────────────────────

export async function getLatestProducts(limit = 5) {
  return prisma.product.findMany({
    where: { isApproved: true, isActive: true, stock: { gt: 0 } },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { businessName: true, supplierType: true } },
    },
  });
}

// ─── Format for AI ────────────────────────────────────────────────────────────

export function formatProductsForAI(
  products: Awaited<ReturnType<typeof getLatestProducts>>
): string {
  if (products.length === 0) {
    return "[CATALOG: No matching products found in store]";
  }

  const formatted = products
    .map((p, i) => {
      const sizes =
        typeof p.sizes === "object" && p.sizes !== null
          ? (p.sizes as { available?: string[] }).available?.join(", ") || "Various"
          : "Various";
      const delivery =
        p.supplier.supplierType === "LOCAL" ? "2-3 business days" : "14-21 business days";
      const status =
        (p as any).isApproved === false
          ? "⏳ PENDING ADMIN APPROVAL (not yet live)"
          : "✅ Live";
      return `${i + 1}. ${p.name} — ₦${Number(p.sellingPrice).toLocaleString()}
   Status: ${status}
   Category: ${p.category || "Fashion"}
   Sizes: ${sizes}
   Stock: ${p.stock} available
   Delivery: ${delivery} (${p.supplier.businessName})
   ${p.description ? `Description: ${p.description.substring(0, 100)}` : ""}
   Image: ${p.imageUrls[0] || "No image"}`;
    })
    .join("\n\n");

  return `[CATALOG — ${products.length} matching products]\n${formatted}`;
}

// ─── User Management ──────────────────────────────────────────────────────────

export async function getOrCreateUser(
  telegramId: string,
  firstName?: string,
  lastName?: string
) {
  let user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user) {
    const displayName =
      [firstName, lastName].filter(Boolean).join(" ").trim() || "Telegram User";
    user = await prisma.user.create({
      data: {
        telegramId,
        email: `tg_${telegramId}@vendo.ng`,
        name: displayName,
        role: "CUSTOMER",
      },
    });
  } else {
    const currentName = [firstName, lastName].filter(Boolean).join(" ").trim();
    if (currentName && user.name !== currentName) {
      user = await prisma.user.update({
        where: { telegramId },
        data: { name: currentName },
      });
    }
  }

  return user;
}

export async function createOrder(
  telegramId: string,
  productId: string,
  phone?: string,
  address?: string
) {
  const user = await getOrCreateUser(telegramId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  return prisma.order.create({
    data: {
      userId: user.id,
      totalAmount: product.sellingPrice,
      status: "PENDING",
      paymentStatus: "UNPAID",
      deliveryAddress: address || null,
      items: {
        create: { productId: product.id, quantity: 1, unitPrice: product.sellingPrice },
      },
    },
    include: { items: { include: { product: true } } },
  });
}

export async function updateUserLocation(telegramId: string, lat: number, lng: number) {
  return prisma.user.update({
    where: { telegramId },
    data: { lat: lat.toString(), lng: lng.toString() },
  });
}

export async function updateUserSizes(
  telegramId: string,
  shoeSize?: string,
  shirtSize?: string
) {
  return prisma.user.update({
    where: { telegramId },
    data: {
      ...(shoeSize && { shoeSize }),
      ...(shirtSize && { shirtSize }),
    },
  });
}

export function formatUserProfileForAI(user: {
  name: string | null;
  shoeSize: string | null;
  shirtSize: string | null;
  phone?: string | null;
  lat?: any;
  lng?: any;
}): string {
  const parts = [`Customer: ${user.name || "Unknown"}`];
  if (user.shoeSize) parts.push(`Shoe size: ${user.shoeSize}`);
  if (user.shirtSize) parts.push(`Shirt size: ${user.shirtSize}`);
  if (user.phone) parts.push(`Phone: ${user.phone}`);
  if (user.lat && user.lng) parts.push(`Delivery Location: Set (GPS Coordinates)`);
  if (!user.shoeSize && !user.shirtSize) parts.push("(No sizes saved — suggest /mysize)");
  return `[CUSTOMER PROFILE]\n${parts.join("\n")}`;
}

export async function getUserOrders(telegramId: string, limit = 5) {
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return [];

  return prisma.order.findMany({
    where: { userId: user.id },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: { product: { select: { name: true, imageUrls: true } } },
      },
    },
  });
}
