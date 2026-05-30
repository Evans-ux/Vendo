/**
 * POST /api/sendbox/cheapest-rate
 *
 * Fetches real-time shipping rates from Sendbox for a given product.
 * Returns the cheapest available courier rate so the supplier knows the
 * logistics fee before listing their product.
 *
 * Body: { category?: string, originState?: string, weight?: number }
 *
 * Uses Sendbox's shipment_delivery_quote endpoint with the correct payload
 * structure including dimension object, service_type, channel_code, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Sendbox token — use SENDBOX_API_KEY from env
const SENDBOX_TOKEN = (
  process.env.SENDBOX_API_KEY || process.env.SENDBOX_ACCESS_TOKEN || ""
).trim();

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

// Default dimensions (cm) per category — matches Sendbox dimension object format
const CATEGORY_DIMENSIONS: Record<
  string,
  { length: number; width: number; height: number }
> = {
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
  name:      "Vendo Supplier",
  street:    "Onitsha Main Market",
  city:      "Onitsha",
  state:     "Anambra",
  country:   "NG",
  post_code: "434101",
  phone:     "+2348012345678",
};

// Default destination — Lagos (most common delivery city in Nigeria)
const DEFAULT_DESTINATION = {
  name:      "Customer",
  street:    "Lagos Island",
  city:      "Lagos Island",
  state:     "Lagos",
  country:   "NG",
  post_code: "101001",
  phone:     "+2348012345678",
};

export async function POST(request: NextRequest) {
  try {
    // Auth check — only logged-in suppliers can fetch rates
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      category = "Other",
      originState,
      weight: customWeight,
    } = body;

    const weight = customWeight ?? CATEGORY_WEIGHTS[category] ?? 0.8;
    const dims =
      CATEGORY_DIMENSIONS[category] ?? CATEGORY_DIMENSIONS.Other;

    const origin = originState
      ? { ...DEFAULT_ORIGIN, state: originState, city: originState }
      : DEFAULT_ORIGIN;

    // ── Try live Sendbox rates ─────────────────────────────────────────────
    if (SENDBOX_TOKEN) {
      /**
       * Sendbox v1 shipment_delivery_quote payload:
       *   origin        - sender address object
       *   destination   - recipient address object
       *   weight        - float (kg)
       *   dimension     - { length, width, height } (cm)  ← key fix: nested object
       *   service_type  - "local" | "international"       ← required field
       *   package_type  - string describing package        ← required field
       *   incoming_option - "pickup" | "dropoff"          ← required field
       *   channel_code  - "api"                           ← required field
       *   total_value   - declared item value in NGN
       */
      const payload = {
        origin,
        destination:     DEFAULT_DESTINATION,
        weight,
        dimension: {          // ← Sendbox requires a nested dimension object
          length: dims.length,
          width:  dims.width,
          height: dims.height,
        },
        service_type:     "local",
        package_type:     `${category} item`,
        incoming_option:  "pickup",
        channel_code:     "api",
        total_value:      5000,  // ₦5,000 default declared value
        currency:         "NGN",
      };

      try {
        const res = await fetch(
          `${SENDBOX_BASE}/v1/shipments/shipment_delivery_quote`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization:  `Bearer ${SENDBOX_TOKEN}`,
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = await res.json();

          // Sendbox returns rates inside data.data, data.rates, or top-level array
          const rates: Array<{
            id?: string;
            service_code?: string;
            name?: string;
            courier?: string;
            amount?: number;
            price?: number;
            eta?: string;
            estimated_days?: number;
          }> = data?.data ?? data?.rates ?? (Array.isArray(data) ? data : []);

          if (Array.isArray(rates) && rates.length > 0) {
            // Normalise and pick cheapest
            const normalised = rates
              .map((r) => ({
                id:          r.id ?? r.service_code ?? "",
                name:        r.name ?? r.courier ?? "Sendbox Courier",
                amount:      r.amount ?? r.price ?? 0,
                eta:         r.eta ?? (r.estimated_days ? `${r.estimated_days} days` : "2-3 business days"),
              }))
              .filter((r) => r.amount > 0)
              .sort((a, b) => a.amount - b.amount);

            if (normalised.length > 0) {
              const cheapest = normalised[0];
              return NextResponse.json({
                price:       cheapest.amount,
                courierId:   cheapest.id || null,
                courierName: cheapest.name,
                eta:         cheapest.eta,
                allRates:    normalised,
                source:      "sendbox_live",
              });
            }
          }

          // API responded OK but returned empty rates — log and fall through
          console.warn("[Sendbox Rate] No rates in response:", JSON.stringify(data).slice(0, 500));
        } else {
          const errText = await res.text();
          console.error("[Sendbox Rate] API error:", res.status, errText);
        }
      } catch (fetchErr: any) {
        console.error("[Sendbox Rate] Fetch failed:", fetchErr.message);
      }
    } else {
      console.warn("[Sendbox Rate] SENDBOX_API_KEY not configured — using static fallback");
    }

    // ── Static fallback (only reached on API failure or missing key) ───────
    const fallbackFees: Record<string, number> = {
      Accessories: 800,
      Footwear:    1500,
      Tops:        1200,
      Bottoms:     1200,
      Dresses:     1200,
      Bags:        2000,
      Jewelry:     800,
      Other:       1500,
    };

    return NextResponse.json({
      price:       fallbackFees[category] ?? 1500,
      courierId:   null,
      courierName: "Standard Delivery",
      source:      "static_fallback",
      note:        SENDBOX_TOKEN
        ? "Sendbox API returned no rates — using static estimates"
        : "SENDBOX_API_KEY not configured — using static estimates",
    });
  } catch (error: any) {
    console.error("[Sendbox Rate] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to fetch logistics rate", details: error.message },
      { status: 500 }
    );
  }
}
