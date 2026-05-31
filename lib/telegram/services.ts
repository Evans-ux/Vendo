// lib/telegram/services.ts
// Database queries and smart search for the Vee AI Telegram bot.
// Query extraction: Groq backup key (in bot.ts) → regex fallback (here)
// Vision: Groq vision key (in bot.ts, isolated)

import prisma from "@/lib/prisma";

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

// ─── Fast Local Query Parser (replaces AI round-trip) ────────────────────────
//
// Extracts structured search params from natural language in <1ms using
// regex + keyword lists. Accurate enough for a shopping bot — no AI needed.

const CATEGORY_MAP: Record<string, string> = {
  sneaker: "Footwear", sneakers: "Footwear", shoe: "Footwear", shoes: "Footwear",
  boot: "Footwear", boots: "Footwear", sandal: "Footwear", sandals: "Footwear",
  heel: "Footwear", heels: "Footwear", loafer: "Footwear", loafers: "Footwear",
  slipper: "Footwear", slippers: "Footwear", slide: "Footwear", slides: "Footwear",
  shirt: "Tops", tshirt: "Tops", polo: "Tops", blouse: "Tops", top: "Tops",
  hoodie: "Tops", sweater: "Tops", cardigan: "Tops", blazer: "Tops",
  dress: "Dresses", gown: "Dresses", jumpsuit: "Dresses",
  trouser: "Bottoms", trousers: "Bottoms", jean: "Bottoms", jeans: "Bottoms",
  pant: "Bottoms", pants: "Bottoms", short: "Bottoms", shorts: "Bottoms",
  skirt: "Bottoms", jogger: "Bottoms", joggers: "Bottoms",
  bag: "Bags", handbag: "Bags", backpack: "Bags", purse: "Bags", clutch: "Bags",
  watch: "Accessories", cap: "Accessories", hat: "Accessories",
  belt: "Accessories", sunglasses: "Accessories", glasses: "Accessories",
  necklace: "Jewelry", bracelet: "Jewelry", ring: "Jewelry", earring: "Jewelry",
  ankara: "Dresses", agbada: "Tops", kaftan: "Tops", dashiki: "Tops",
};

const COLORS = new Set([
  "black","white","red","blue","green","yellow","pink","purple","brown",
  "grey","gray","navy","beige","gold","silver","orange","cream","burgundy",
  "maroon","teal","coral","nude","khaki","olive",
]);

const STOP_WORDS = new Set([
  "i","me","my","want","need","show","find","get","buy","order","please",
  "can","you","have","do","a","an","the","is","are","for","of","in","on",
  "with","and","or","some","any","give","looking","something","like","nice",
  "good","best","cheap","affordable","quality","new","latest","trending",
]);

export function extractSearchParams(userMessage: string): SmartSearchParams {
  const lower = userMessage.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const words = lower.split(/\s+/).filter(w => w.length >= 2);

  // Extract price: "under 20k", "below 15000", "max 30k", "between 10k and 20k"
  let maxPrice: number | null = null;
  let minPrice = 0;
  const priceMatch = lower.match(/(?:under|below|max|less than)\s*(\d+)\s*k?/);
  if (priceMatch) maxPrice = parseInt(priceMatch[1]) * (lower.includes("k") ? 1000 : 1);
  const betweenMatch = lower.match(/between\s*(\d+)\s*k?\s*(?:and|to|-)\s*(\d+)\s*k?/);
  if (betweenMatch) {
    minPrice = parseInt(betweenMatch[1]) * 1000;
    maxPrice = parseInt(betweenMatch[2]) * 1000;
  }

  // Extract sizes: "size 42", "size L", "XL", "UK 9"
  const sizes: string[] = [];
  const sizeMatch = lower.match(/\b(?:size\s+)?(\d{2}|xs|s\b|m\b|l\b|xl|xxl|uk\s*\d+)\b/gi);
  if (sizeMatch) sizes.push(...sizeMatch.map(s => s.replace(/size\s*/i, "").trim().toUpperCase()));

  // Detect category and colors
  let category: string | null = null;
  const colors: string[] = [];
  const keywords: string[] = [];

  for (const word of words) {
    if (STOP_WORDS.has(word)) continue;
    if (COLORS.has(word)) { colors.push(word); continue; }
    if (CATEGORY_MAP[word]) { category = CATEGORY_MAP[word]; keywords.push(word); continue; }
    if (word.length >= 3) keywords.push(word);
  }

  const isProductQuery = keywords.length > 0 || colors.length > 0 || category !== null;

  return {
    keywords: keywords.slice(0, 5),
    category,
    colors,
    sizes,
    maxPrice,
    minPrice,
    isProductQuery,
  };
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
      isDeleted: false,
      stock: { gt: 0 },
      supplier: { isActive: true, kycStatus: "APPROVED" },
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
        isDeleted: false,
        stock: { gt: 0 },
        supplier: { isActive: true, kycStatus: "APPROVED" },
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
  // Still filter by active supplier — suspended suppliers are never shown
  const pass3 = await prisma.product.findMany({
    where: {
      isActive: true,
      isDeleted: false,
      supplier: { isActive: true },
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
  const params = extractSearchParams(query);

  if (!params.isProductQuery) {
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
  address?: string,
  size?: string
) {
  const user = await getOrCreateUser(telegramId);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { supplier: true },
  });
  if (!product) throw new Error("Product not found");
  if (!product.isApproved || !product.isActive || (product as any).isDeleted) throw new Error("Product is not available");
  if (product.stock < 1) throw new Error("Product is out of stock");

  // Generate a human-readable order number
  const count = await prisma.order.count();
  const orderNumber = `VND-${String(count + 1).padStart(6, "0")}`;

  // Update user phone if provided
  if (phone) {
    await prisma.user.update({ where: { id: user.id }, data: { phone } });
  }

  return prisma.order.create({
    data: {
      userId: user.id,
      orderNumber,
      totalAmount: product.sellingPrice,
      status: "PENDING",
      paymentStatus: "UNPAID",
      deliveryAddress: address || null,
      items: {
        create: {
          productId: product.id,
          quantity: 1,
          unitPrice: product.sellingPrice,
          size: size || null,
        },
      },
    },
    include: {
      items: { include: { product: { include: { supplier: true } } } },
      user: { select: { email: true, name: true, phone: true } },
    },
  });
}

/**
 * Generate a Flutterwave payment link for an order.
 * Called directly from the bot after order creation.
 */
export async function generatePaymentLink(orderId: string): Promise<string> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendo.com.ng";

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { email: true, name: true, phone: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  if (!order) throw new Error("Order not found");
  if (order.paymentStatus === "PAID") throw new Error("Order already paid");

  const FLW_SECRET =
    process.env.FLW_MODE === "production"
      ? process.env.FLW_SECRET_KEY_LIVE
      : process.env.FLW_SECRET_KEY_TEST;

  if (!FLW_SECRET) throw new Error("Flutterwave secret key not configured");

  const txRef = `vendo_${order.id}_${Date.now()}`;
  const productNames = order.items.map((i) => i.product.name).join(", ");

  const res = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FLW_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: txRef,
      amount: Number(order.totalAmount),
      currency: "NGN",
      redirect_url: `${siteUrl}/api/flutterwave/callback`,
      customer: {
        email: order.user.email,
        name: order.user.name ?? undefined,
        phone_number: order.user.phone ?? undefined,
      },
      meta: { orderId: order.id, userId: order.userId },
      customizations: {
        title: "Vendo Payment",
        description: `Payment for: ${productNames}`,
        logo: `${siteUrl}/vendo-logo.png`,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.status !== "success") {
    throw new Error(data.message ?? `Flutterwave error ${res.status}`);
  }

  // Store tx_ref on the order
  await prisma.order.update({
    where: { id: orderId },
    data: { paymentRef: txRef },
  });

  return data.data.link as string;
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
