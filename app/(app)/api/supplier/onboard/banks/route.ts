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
      return NextResponse.json(
        { message: "Flutterwave configuration is missing." },
        { status: 500 }
      );
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
      return NextResponse.json(
        { message: data.message || "Failed to load bank codes from provider." },
        { status: 400 }
      );
    }

    // Return sorted list with id (code) and name
    const uniqueBanks = Array.from(
  new Map(
    data.data.map((bank: { code: string; name: string }) => [
      `${bank.code}-${bank.name}`,
      {
        code: String(bank.code),
        name: bank.name,
      },
    ])
  ).values()
);

const banks = uniqueBanks.sort((a:any , b:any) =>
  a.name.localeCompare(b.name)
);

return NextResponse.json({ banks });
  } catch (error: any) {
    console.error("Internal banks fetch error:", error);
    return NextResponse.json(
      { message: "Internal error loading bank codes.", error: error.message },
      { status: 500 }
    );
  }
}
