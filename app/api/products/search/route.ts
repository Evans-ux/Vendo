// app/api/products/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchProducts, extractSearchParams, formatSearchResults, parsePriceRange } from "@/lib/product-search";

// ═══════════════════════════════════════════════════════════════════════════
// SECURE PRODUCT SEARCH ENDPOINT
// Used by Telegram bot to search products without direct DB access
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const { query, priceText, limit = 10, minScore = 50 } = await request.json();

    // Validate input
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    // Prevent injection/abuse
    if (query.length > 200) {
      return NextResponse.json({ error: "Query too long" }, { status: 400 });
    }

    // Extract search parameters from natural language
    const params = extractSearchParams(priceText || query);

    // Parse price range
    const priceRange = priceText ? parsePriceRange(priceText) : params.priceRange;

    // Search with verification
    const results = await searchProducts(query, priceRange, Math.min(limit, 50), minScore);

    return NextResponse.json({
      success: true,
      query,
      resultsCount: results.length,
      priceRange,
      extractedParams: params,
      products: results,
      formattedMessage: formatSearchResults(results),
    });
  } catch (error) {
    console.error("Search endpoint error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

// GET version for browser/simple queries
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q");
    const priceText = searchParams.get("price");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
    }

    const priceRange = priceText ? parsePriceRange(priceText) : parsePriceRange("");
    const results = await searchProducts(query, priceRange, Math.min(limit, 50));

    return NextResponse.json({
      success: true,
      query,
      resultsCount: results.length,
      priceRange,
      products: results,
    });
  } catch (error) {
    console.error("Search GET error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
