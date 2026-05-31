/**
 * POST /api/sendbox/cheapest-rate
 *
 * Fetches real-time shipping quotes from Sendbox for a given product category.
 * Returns the cheapest available courier rate so the supplier knows the
 * logistics fee before listing their product.
 *
 * Body: {
 *   category?: string,
 *   pickupAddress?: string, pickupCity?: string, pickupState?: string,
 *   pickupPostCode?: string, pickupPhone?: string
 * }
 *
 * Docs: https://docs.sendbox.co/shipping/request-shipping-quotes
 * Auth: Authorization: {token}  (no "Bearer" prefix — Sendbox's format)
 * Endpoint: POST https://live.sendbox.co/shipping/shipment_delivery_quote
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SENDBOX_TOKEN = (process.env.SENDBOX_API_KEY || "").trim();
const SENDBOX_BASE  = "https://live.sendbox.co";

// Default weights (kg) per category
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

// Default dimensions (cm) per category — nested object as Sendbox requires
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

// Static fallback fees (used when Sendbox API is unavailable)
const FALLBACK_FEES: Record<string, number> = {
  Accessories: 800,
  Footwear:    1500,
  Tops:        1200,
  Bottoms:     1200,
  Dresses:     1200,
  Bags:        2000,
  Jewelry:     800,
  Other:       1500,
};

// Default destination — Lagos Island (most common delivery city in Nigeria)
const DEFAULT_DESTINATION = {
  first_name: "Customer",
  last_name:  "Delivery",
  street:     "Lagos Island",
  city:       "Lagos Island",
  state:      "Lagos",
  country:    "NG",
  post_code:  "101001",
  phone:      "+2348012345678",
};

export async function POST(request: NextRequest) {
  try {
    // Auth check — only logged-in suppliers can fetch rates
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      category = "Other",
      pickupAddress,
      pickupCity,
      pickupState,
      pickupPostCode,
      pickupPhone,
    } = body;

    const weight = CATEGORY_WEIGHTS[category] ?? 0.8;
    const dims   = CATEGORY_DIMENSIONS[category] ?? CATEGORY_DIMENSIONS.Other;

    // Build origin — use supplier's real pickup address if provided
    const origin = {
      first_name: "Supplier",
      last_name:  "Pickup",
      street:     pickupAddress || "Onitsha Main Market",
      city:       pickupCity    || "Onitsha",
      state:      pickupState   || "Anambra",
      country:    "NG",
      post_code:  pickupPostCode || "434101",
      phone:      pickupPhone   || "+2348012345678",
    };

    // ── Try live Sendbox rates ─────────────────────────────────────────────
    if (SENDBOX_TOKEN) {
      const payload = {
        origin,
        destination: DEFAULT_DESTINATION,
        weight,
        dimension: {          // nested object — required by Sendbox
          length: dims.length,
          width:  dims.width,
          height: dims.height,
        },
        incoming_option: "pickup",
        region:          "NG",
        service_type:    "local",
        package_type:    "general",
        total_value:     5000,
        currency:        "NGN",
        channel_code:    "api",
        pickup_date:     new Date().toISOString().split("T")[0],
        items: [
          {
            name:      `${category} item`,
            item_type: "other",
            hts_code:  "9001.21",
            quantity:  1,
            weight,
            value:     5000,
          },
        ],
        service_code:    "standard",
        customs_option:  "recipient",
      };

      try {
        const res = await fetch(
          `${SENDBOX_BASE}/shipping/shipment_delivery_quote`,
          {
            method: "POST",
            headers: {
              "Content-Type":  "application/json",
              // Sendbox auth: raw token, no "Bearer" prefix
              "Authorization": SENDBOX_TOKEN,
            },
            body: JSON.stringify(payload),
          }
        );

        if (res.ok) {
          const data = await res.json();

          // Sendbox returns quotes in data.rates, data.data, data.quotes, or top-level array
          const quotes: Array<{
            key?: string;
            id?: string;
            service_code?: string;
            name?: string;
            courier?: string;
            courier_name?: string;
            fee?: number;
            amount?: number;
            price?: number;
            total?: number;
            delivery_eta_string?: string;
            eta?: string;
            estimated_days?: number;
            sla_description?: string;
          }> = data?.rates ?? data?.data ?? data?.quotes ?? (Array.isArray(data) ? data : []);

          if (Array.isArray(quotes) && quotes.length > 0) {
            const normalised = quotes
              .map((q) => ({
                id:     q.key ?? q.id ?? q.service_code ?? "",
                name:   q.name ?? q.courier_name ?? q.courier ?? "Sendbox Courier",
                // Sendbox uses `fee` as the total (inclusive of VAT + insurance)
                amount: q.fee ?? q.amount ?? q.price ?? q.total ?? 0,
                eta:    q.delivery_eta_string ?? q.sla_description ?? q.eta ??
                        (q.estimated_days ? `${q.estimated_days} days` : "2–3 business days"),
              }))
              .filter((q) => q.amount > 0)
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

          console.warn("[Sendbox Rate] No quotes in response:", JSON.stringify(data).slice(0, 500));
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

    // ── Static fallback ────────────────────────────────────────────────────
    return NextResponse.json({
      price:       FALLBACK_FEES[category] ?? 1500,
      courierId:   null,
      courierName: "Standard Delivery",
      source:      "static_fallback",
      note:        SENDBOX_TOKEN
        ? "Sendbox API returned no quotes — using static estimates"
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
