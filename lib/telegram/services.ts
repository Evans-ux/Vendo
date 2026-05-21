// lib/telegram/services.ts
// Database queries for the Vee AI Telegram bot

import prisma from "@/lib/prisma";

// ─── Product Search ──────────────────────────────────────────────────────────

/**
 * Search products by text query. Splits query into keywords and searches
 * name, description, and category fields. Only returns approved, active,
 * in-stock products.
 */
export async function searchProducts(query: string, limit = 5) {
  // Extract meaningful keywords (skip tiny words)
  const keywords = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  if (keywords.length === 0) {
    // If no usable keywords, return latest products
    return getLatestProducts(limit);
  }

  const products = await prisma.product.findMany({
    where: {
      isApproved: true,
      isActive: true,
      stock: { gt: 0 },
      OR: keywords.flatMap((keyword) => [
        { name: { contains: keyword, mode: "insensitive" as const } },
        { description: { contains: keyword, mode: "insensitive" as const } },
        { category: { contains: keyword, mode: "insensitive" as const } },
      ]),
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: {
        select: {
          businessName: true,
          supplierType: true,
        },
      },
    },
  });

  return products;
}

/**
 * Get the latest approved products — used for /shop and fallback searches
 */
export async function getLatestProducts(limit = 5) {
  return prisma.product.findMany({
    where: {
      isApproved: true,
      isActive: true,
      stock: { gt: 0 },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: {
        select: {
          businessName: true,
          supplierType: true,
        },
      },
    },
  });
}

/**
 * Format products into a readable string for the AI context
 */
export function formatProductsForAI(
  products: Awaited<ReturnType<typeof searchProducts>>
): string {
  if (products.length === 0) {
    return "[CATALOG: No matching products found in store]";
  }

  const formatted = products
    .map((p, i) => {
      const sizes =
        typeof p.sizes === "object" && p.sizes !== null
          ? (p.sizes as { available?: string[] }).available?.join(", ") ||
            "Various"
          : "Various";
      const delivery =
        p.supplier.supplierType === "LOCAL"
          ? "2-3 business days"
          : "14-21 business days";
      return `${i + 1}. ${p.name} — ₦${Number(p.sellingPrice).toLocaleString()}
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

// ─── User Management ─────────────────────────────────────────────────────────

/**
 * Get or create a user by their Telegram ID.
 * Creates a placeholder email for new Telegram users.
 */
export async function getOrCreateUser(
  telegramId: string,
  firstName?: string,
  lastName?: string
) {
  let user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Telegram User";
    user = await prisma.user.create({
      data: {
        telegramId,
        email: `tg_${telegramId}@vendo.ng`,
        name: displayName,
        role: "CUSTOMER",
      },
    });
  }

  return user;
}

/**
 * Update a user's size profile
 */
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

/**
 * Format user profile for AI context
 */
export function formatUserProfileForAI(user: {
  name: string | null;
  shoeSize: string | null;
  shirtSize: string | null;
}): string {
  const parts = [`Customer: ${user.name || "Unknown"}`];
  if (user.shoeSize) parts.push(`Shoe size: ${user.shoeSize}`);
  if (user.shirtSize) parts.push(`Shirt size: ${user.shirtSize}`);
  if (!user.shoeSize && !user.shirtSize) {
    parts.push("(No sizes saved — suggest /mysize)");
  }
  return `[CUSTOMER PROFILE]\n${parts.join("\n")}`;
}

// ─── Order Queries ───────────────────────────────────────────────────────────

/**
 * Get recent orders for a user
 */
export async function getUserOrders(telegramId: string, limit = 5) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) return [];

  return prisma.order.findMany({
    where: { userId: user.id },
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          product: {
            select: { name: true, imageUrls: true },
          },
        },
      },
    },
  });
}
