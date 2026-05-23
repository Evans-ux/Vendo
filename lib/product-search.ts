// lib/product-search.ts
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════
// PRICE RANGE PARSER
// Handles: "56k", "56,000", "50-60k", "50k-60k", "under 100k", "above 30k"
// ═══════════════════════════════════════════════════════════════════════════

export interface PriceRange {
  min: number;
  max: number;
}

export function parsePriceRange(priceText: string): PriceRange {
  // Default safe range
  const defaultRange = { min: 0, max: 10000000 };

  if (!priceText) return defaultRange;

  const text = priceText.toLowerCase().trim();

  // Handle "under X" or "below X"
  if (text.includes("under") || text.includes("below")) {
    const match = text.match(/\d+([.,]\d+)?(?:\s*[km])?/i);
    if (match) {
      const num = parseFloat(match[0].replace(/,/g, "")) * (text.includes("k") ? 1000 : 1);
      return { min: 0, max: num };
    }
  }

  // Handle "above X" or "more than X"
  if (text.includes("above") || text.includes("more than") || text.includes("from")) {
    const match = text.match(/\d+([.,]\d+)?(?:\s*[km])?/i);
    if (match) {
      const num = parseFloat(match[0].replace(/,/g, "")) * (text.includes("k") ? 1000 : 1);
      return { min: num, max: 10000000 };
    }
  }

  // Handle "X-Y" range
  if (text.includes("-")) {
    const parts = text.split("-");
    if (parts.length === 2) {
      const min = parseFloat(parts[0].replace(/[^0-9.]/g, "")) * (parts[0].includes("k") ? 1000 : 1);
      const max = parseFloat(parts[1].replace(/[^0-9.]/g, "")) * (parts[1].includes("k") ? 1000 : 1);
      return { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  // Handle single price like "56k" or "56,000"
  const match = text.match(/\d+([.,]\d+)?(?:\s*[km])?/i);
  if (match) {
    const num = parseFloat(match[0].replace(/,/g, "")) * (text.includes("k") ? 1000 : 1);
    // If single price, create range around it (±20%)
    return { min: num * 0.8, max: num * 1.2 };
  }

  return defaultRange;
}

// ═══════════════════════════════════════════════════════════════════════════
// SUPPLIER VERIFICATION
// Checks: KYC status, active status, business verification
// ═══════════════════════════════════════════════════════════════════════════

export interface SupplierScore {
  supplierId: string;
  isVerified: boolean;
  score: number; // 0-100
  kycStatus: string;
  businessVerified: boolean;
  hasBank: boolean;
  rating: number;
  totalOrders: number;
  successRate: number;
  verificationReasons: string[];
}

export async function verifySupplier(supplierId: string): Promise<SupplierScore> {
  // Initialize Supabase client only when needed, at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build"; 
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    // Get supplier details
    const { data: supplier, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, kycStatus, isActive, businessDocUrl, bankName, accountNumber")
      .eq("id", supplierId)
      .single();

    if (supplierError || !supplier) {
      return {
        supplierId,
        isVerified: false,
        score: 0,
        kycStatus: "NOT_FOUND",
        businessVerified: false,
        hasBank: false,
        rating: 0,
        totalOrders: 0,
        successRate: 0,
        verificationReasons: ["Supplier not found"],
      };
    }

    let score = 0;
    const reasons: string[] = [];

    // Check 1: KYC Status
    const kycApproved = supplier.kycStatus === "APPROVED";
    if (!kycApproved) {
      reasons.push(`KYC Status: ${supplier.kycStatus}`);
    } else {
      score += 30;
    }

    // Check 2: Active Status
    if (!supplier.isActive) {
      reasons.push("Supplier is inactive");
    } else {
      score += 20;
    }

    // Check 3: Business Verification
    const businessVerified = !!supplier.businessDocUrl;
    if (!businessVerified) {
      reasons.push("Business documents not verified");
    } else {
      score += 20;
    }

    // Check 4: Bank Account
    const hasBank = !!supplier.accountNumber;
    if (!hasBank) {
      reasons.push("No verified bank account");
    } else {
      score += 15;
    }

    // Check 5: Order History & Rating (if exists)
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("status, id")
        .eq("supplier_id", supplierId);

      const totalOrders = orders?.length || 0;
      const deliveredOrders = orders?.filter((o) => o.status === "DELIVERED").length || 0;
      const successRate = totalOrders > 0 ? (deliveredOrders / totalOrders) * 100 : 0;

      if (totalOrders > 0) {
        score += Math.min(15, (successRate / 100) * 15);
      }

      return {
        supplierId,
        isVerified: kycApproved && supplier.isActive,
        score: Math.round(score),
        kycStatus: supplier.kycStatus,
        businessVerified,
        hasBank,
        rating: successRate > 80 ? 5 : successRate > 60 ? 4 : 3,
        totalOrders,
        successRate,
        verificationReasons: reasons,
      };
    } catch (error) {
      return {
        supplierId,
        isVerified: kycApproved && supplier.isActive,
        score: Math.round(score),
        kycStatus: supplier.kycStatus,
        businessVerified,
        hasBank,
        rating: 3,
        totalOrders: 0,
        successRate: 0,
        verificationReasons: reasons,
      };
    }
  } catch (error) {
    console.error("Supplier verification error:", error);
    return {
      supplierId,
      isVerified: false,
      score: 0,
      kycStatus: "ERROR",
      businessVerified: false,
      hasBank: false,
      rating: 0,
      totalOrders: 0,
      successRate: 0,
      verificationReasons: ["Verification failed"],
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SEARCH WITH FILTERING
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchResult {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  imageUrls: string[];
  sizes: string[];
  stock: number;
  deliveryMethod: string;
  logisticsFee: number | null;
  supplier: {
    id: string;
    businessName: string;
    supplierType: string;
    rating: number;
    successRate: number;
  };
  verificationScore: number;
}

export async function searchProducts(
  query: string,
  priceRange: PriceRange,
  limit: number = 10,
  minVerificationScore: number = 50
): Promise<SearchResult[]> {
  // Initialize Supabase client only when needed, at runtime
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";
  const supabase = createClient(supabaseUrl, supabaseKey);
  try {
    // Get all verified suppliers first
    const { data: suppliers, error: supplierError } = await supabase
      .from("suppliers")
      .select("id, businessName, supplierType, kycStatus, isActive, businessDocUrl")
      .eq("kycStatus", "APPROVED")
      .eq("isActive", true);

    if (supplierError || !suppliers) {
      console.error("Supplier fetch error:", supplierError);
      return [];
    }

    // Verify and score suppliers
    const verifiedSuppliers = new Map<string, SupplierScore>();
    for (const supplier of suppliers) {
      const score = await verifySupplier(supplier.id);
      if (score.score >= minVerificationScore) {
        verifiedSuppliers.set(supplier.id, score);
      }
    }

    if (verifiedSuppliers.size === 0) {
      return [];
    }

    // Get products from verified suppliers
    const { data: products, error: productError } = await supabase
      .from("products")
      .select(
        `id, name, description, category, basePrice, sellingPrice, 
         imageUrls, sizes, stock, deliveryMethod, logisticsFee, supplierId`
      )
      .in("supplierId", Array.from(verifiedSuppliers.keys()))
      .eq("isApproved", true)
      .eq("isActive", true)
      .ilike("name", `%${query}%`)
      .gte("sellingPrice", priceRange.min)
      .lte("sellingPrice", priceRange.max)
      .gt("stock", 0)
      .limit(limit);

    if (productError) {
      console.error("Product fetch error:", productError);
      return [];
    }

    // Format results
    const results: SearchResult[] = [];
    for (const product of products || []) {
      const supplierScore = verifiedSuppliers.get(product.supplierId);
      if (!supplierScore) continue;

      results.push({
        id: product.id,
        name: product.name,
        description: product.description || "",
        category: product.category || "Uncategorized",
        basePrice: parseFloat(product.basePrice),
        sellingPrice: parseFloat(product.sellingPrice),
        imageUrls: product.imageUrls || [],
        sizes: JSON.parse(product.sizes || '{"available":[]}').available || [],
        stock: product.stock,
        deliveryMethod: product.deliveryMethod,
        logisticsFee: product.logisticsFee ? parseFloat(product.logisticsFee) : null,
        supplier: {
          id: product.supplierId,
          businessName: suppliers.find((s) => s.id === product.supplierId)?.businessName || "Unknown",
          supplierType: suppliers.find((s) => s.id === product.supplierId)?.supplierType || "UNKNOWN",
          rating: supplierScore.rating,
          successRate: supplierScore.successRate,
        },
        verificationScore: supplierScore.score,
      });
    }

    // Sort by verification score and rating
    return results.sort((a, b) => {
      const scoreA = a.verificationScore + a.supplier.rating * 10;
      const scoreB = b.verificationScore + b.supplier.rating * 10;
      return scoreB - scoreA;
    });
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXTRACT SEARCH PARAMETERS FROM NATURAL LANGUAGE
// ═══════════════════════════════════════════════════════════════════════════

export interface SearchParams {
  itemType: string;
  color?: string;
  size?: string;
  priceRange: PriceRange;
}

export function extractSearchParams(userMessage: string): SearchParams {
  const message = userMessage.toLowerCase();

  // Extract color
  const colors = ["black", "white", "red", "blue", "green", "yellow", "brown", "gray", "pink"];
  const color = colors.find((c) => message.includes(c));

  // Extract size (shoe: 40-47, clothing: XS-XXL)
  const sizeMatch = message.match(/size\s*(\d+|x{0,2}[sl])\b/i);
  const size = sizeMatch ? sizeMatch[1] : undefined;

  // Extract item type (remove price and color info)
  let itemType = message;
  if (color) itemType = itemType.replace(color, "");
  const priceMatch = itemType.match(/\b(under|above|from|within|between|range|ranging|around)\s*[^a-z]+\d+/i);
  if (priceMatch) itemType = itemType.replace(priceMatch[0], "");
  itemType = itemType.trim().replace(/\s+/g, " ");

  // Extract price
  const priceText = message.match(/\b(under|above|from|within|between|range|around)?\s*([^a-z]*\d+[.,]?\d*\s*[km]?(?:\s*-\s*\d+[.,]?\d*\s*[km]?)?)/i)?.[0] || "";
  const priceRange = parsePriceRange(priceText);

  return {
    itemType,
    color,
    size,
    priceRange,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT SEARCH RESULTS FOR TELEGRAM
// ═══════════════════════════════════════════════════════════════════════════

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) {
    return (
      "😕 No products found matching your criteria.\n\n" +
      "Try:\n" +
      "• Different color or size\n" +
      "• Broader price range\n" +
      "• Different item description"
    );
  }

  let message = `✅ Found ${results.length} products!\n\n`;

  results.slice(0, 5).forEach((product, idx) => {
    const isLocal = product.supplier.supplierType === "LOCAL";
    const deliveryTime = isLocal ? "2-3 days 🚗" : "14-21 days 📦";
    const deliveryType = isLocal ? "LOCAL waybill" : "Dropshipping / Third-party logistics";
    const rating = "⭐".repeat(Math.floor(product.supplier.rating));

    message += `${idx + 1}. *${product.name}*\n`;
    message += `   💰 ₦${product.sellingPrice.toLocaleString()} (was ₦${product.basePrice.toLocaleString()})\n`;
    message += `   📏 ${product.sizes.join(", ") || "Various sizes"}\n`;
    message += `   🏪 ${product.supplier.businessName} ${rating}\n`;
    message += `   🚚 Delivery Type: ${deliveryType} · ETA: ${deliveryTime}\n`;
    message += `   📦 Stock: ${product.stock} available\n`;
    message += `   ID: \`${product.id}\`\n\n`;
  });

  if (results.length > 5) {
    message += `\n...and ${results.length - 5} more products available!\n`;
  }

  message += `Reply with product ID to order or ask for more details!`;

  return message;
}
