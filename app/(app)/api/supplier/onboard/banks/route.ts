/**
 * GET /api/supplier/onboard/banks
 *
 * Returns the list of Nigerian banks with their Flutterwave bank codes.
 * Cached for 24 hours — bank list rarely changes.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FALLBACK_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "076", name: "Polaris Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
  { code: "100004", name: "Opay" },
  { code: "100011", name: "Kuda Bank" },
  { code: "100033", name: "Palmpay" },
];

const FLW_SECRET = (
  process.env.FLW_MODE === "production"
    ? process.env.FLW_SECRET_KEY_LIVE
    : process.env.FLW_SECRET_KEY_TEST
)?.trim();

export async function GET() {
  try {
    if (!FLW_SECRET) {
      console.error("FLW_SECRET is missing. MODE:", process.env.FLW_MODE);
      return NextResponse.json({ banks: FALLBACK_BANKS, warning: "Using fallback banks due to missing config" });
    }

    const res = await fetch("https://api.flutterwave.com/v3/banks/NG", {
      headers: {
        Authorization: `Bearer ${FLW_SECRET}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 3600 }, // Reduce cache to 1 hour to recover faster from errors
    });

    const data = await res.json();

    if (!res.ok || data.status !== "success") {
      console.error("Flutterwave API error:", data);
      // Return fallback banks so the UI doesn't break
      return NextResponse.json({ 
        banks: FALLBACK_BANKS, 
        warning: "Using fallback banks due to provider error",
        provider_error: data.message 
      });
    }

    // Return sorted list with id (code) and name
    const banks: { code: string; name: string }[] = data.data
      .map((b: { code: string; name: string }) => ({
        code: String(b.code),
        name: b.name,
      }))
      .sort((a: { name: string }, b: { name: string }) =>
        a.name.localeCompare(b.name)
      );

    return NextResponse.json({ banks });
  } catch (error: any) {
    console.error("Internal banks fetch error:", error);
    return NextResponse.json({ 
      banks: FALLBACK_BANKS, 
      warning: "Using fallback banks due to internal error",
      error: error.message 
    });
  }
}
