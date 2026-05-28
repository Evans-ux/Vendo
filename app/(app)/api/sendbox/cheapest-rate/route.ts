/**
 * POST /api/sendbox/cheapest-rate
 *
 * Fetches real-time shipping rates from Sendbox for a given product category.
 * Returns the cheapest available courier rate so the supplier knows the
 * logistics fee before listing their product.
 *
 * Body: { category: string, originState?: string, weight?: number }
 *
 * The origin defaults to Onitsha (Vendo HQ) if not provided.
 * Weight defaults are based on product category.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SENDBOX_TOKEN = process.env.SENDBOX_API_KEY || process.env.SENDBOX_ACCESS_TOKEN || "";
const SENDBOX_BASE = "https://api.sendbox.co";

// Default weights (kg) per category — used when supplier doesn't specify
const CATEGORY_WEIGHTS: Record<string, number> = {
  Footwear:    1.0,
  Tops:        0.5,
  Bottoms:     0.6,
  Dresses:     0.7,
  Bags:        1.2,
  Jewelry:     0.2,
  Accessories: 0.3,
  Other:       0.8,
};

// Default dimensions (cm) per category
const CATEGORY_DIMENSIONS: Record<string, { length: number; width: number; height: number }> = {
  Footwear:    { length: 35, width: 25, height: 15 },
  Tops:        { length: 30, width: 25, height: 5  },
  Bottoms:     { length: 35, width: 30, height: 5  },
  Dresses:     { length: 40, width: 30, height: 5  },
  Bags:        { length: 35, width: 25, height: 20 },
  Jewelry:     { length: 15, width: 10, height: 5  },
  Accessories: { length: 20, width: 15, height: 5  },
  Other:       { length: 30, width: 25, height: 10 },
};

// Vendo default origin — Onitsha, Anambra
const DEFAULT_ORIGIN = {
  name: "Vendo Supplier",
  street: "Onitsha Main Market",
  city: "Onitsha",
  state: "Anambra",
  country: "NG",
  post_code: "434101",
  phone: "+2348012345678",
};

// Default destination — Lagos (most common delivery city in Nigeria)
const DEFAULT_DESTINATION = {
  name: "Customer",
  street: "Lagos Island",
  city: "Lagos Island",
  state: "Lagos",
  country: "NG",
  post_code: "101001",
  phone: "+2348012345678",
};

export async function POST(request: NextRequest) {
  try {
    // Auth check — only logged-in suppliers can fetch rates
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!SENDBOX_TOKEN) {
      // Sendbox not configured — return category-based static fallback
      const { category = "Other" } = await request.json().catch(() => ({}));
      const fallbackFees: Record<string, number> = {
        Accessories: 800, Footwear: 1500, Tops: 1200, Bottoms: 1200,
        Dresses: 1200, Bags: 2000, Jewelry: 800, Other: 1500,
      };
      return NextResponse.json({
        price: fallbackFees[category] ?? 1500,
        courierId: null,
        courierName: "Standard Delivery",
        source: "static_fallback",
        note: "SENDBOX_API_KEY not configured — using static rates",
      });
    }

    const body = await request.json().catch(() => ({}));
    const {
      category = "Other",
      originState,
      weight: customWeight,
    } = body;

    const weight = customWeight ?? CATEGORY_WEIGHTS[category] ?? 0.8;
    const dims = CATEGORY_DIMENSIONS[category] ?? CATEGORY_DIMENSIONS.Other;

    const origin = originState
      ? { ...DEFAULT_ORIGIN, state: originState, city: originState }
      : DEFAULT_ORIGIN;

    // Sendbox rate request payload
    const payload = {
      origin,
      destination: DEFAULT_DESTINATION,
      weight,
      length: dims.length,
      width: dims.width,
      height: dims.height,
      declared_value: 5000, // ₦5,000 default declared value
      description: `${category} item`,
    };

    const res = await fetch(`${SENDBOX_BASE}/v1/shipments/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SENDBOX_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[Sendbox Rate] API error:", res.status, errText);

      // Return static fallback on API error
      const fallbackFees: Record<string, number> = {
        Accessories: 800, Footwear: 1500, Tops: 1200, Bottoms: 1200,
        Dresses: 1200, Bags: 2000, Jewelry: 800, Other: 1500,
      };
      return NextResponse.json({
        price: fallbackFees[category] ?? 1500,
        courierId: null,
        courierName: "Standard Delivery",
        source: "static_fallback",
        note: `Sendbox API returned ${res.status} — using static rates`,
      });
    }

    const data = await res.json();

    // Sendbox returns an array of courier options — pick the cheapest
    const rates: Array<{ id: string; name: string; amount: number; eta?: string }> =
      data.data ?? data.rates ?? data ?? [];

    if (!Array.isArray(rates) || rates.length === 0) {
      const fallbackFees: Record<string, number> = {
        Accessories: 800, Footwear: 1500, Tops: 1200, Bottoms: 1200,
        Dresses: 1200, Bags: 2000, Jewelry: 800, Other: 1500,
      };
      return NextResponse.json({
        price: fallbackFees[category] ?? 1500,
        courierId: null,
        courierName: "Standard Delivery",
        source: "static_fallback",
        note: "No rates returned from Sendbox",
      });
    }

    // Sort by price ascending — cheapest first
    const sorted = [...rates].sort((a, b) => (a.amount ?? 0) - (b.amount ?? 0));
    const cheapest = sorted[0];

    return NextResponse.json({
      price: cheapest.amount,
      courierId: cheapest.id ?? null,
      courierName: cheapest.name ?? "Sendbox Courier",
      eta: cheapest.eta ?? "2-3 business days",
      allRates: sorted.map((r) => ({
        id: r.id,
        name: r.name,
        price: r.amount,
        eta: r.eta,
      })),
      source: "sendbox_live",
    });
  } catch (error: any) {
    console.error("[Sendbox Rate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logistics rate", details: error.message },
      { status: 500 }
    );
  }
}
