/**
 * GET  /api/supplier/onboard/verify-account?account_number=XXXX&account_bank=044
 *
 * Proxies to Flutterwave's account resolution endpoint.
 * Returns the verified account holder name for the given account number + bank code.
 * Keeps the Flutterwave secret key server-side only.
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FLW_SECRET = (
  process.env.FLW_MODE === "production"
    ? process.env.FLW_SECRET_KEY_LIVE
    : process.env.FLW_SECRET_KEY_TEST
)?.trim();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const account_number = searchParams.get("account_number");
  const account_bank = searchParams.get("account_bank");

  if (!account_number || !account_bank) {
    return NextResponse.json(
      { message: "account_number and account_bank are required" },
      { status: 400 }
    );
  }

  if (!/^\d{10}$/.test(account_number)) {
    return NextResponse.json(
      { message: "Account number must be exactly 10 digits" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `https://api.flutterwave.com/v3/accounts/resolve?account_number=${account_number}&account_bank=${account_bank}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
      }
    );

    const data = await res.json();

    if (!res.ok || data.status !== "success") {
      console.error("Flutterwave verification error:", data);
      
      return NextResponse.json(
        { 
          message: data.message || "Could not verify account. Check the details and try again.",
          provider_error: data.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      account_name: data.data.account_name,
      account_number: data.data.account_number,
    });
  } catch (error: any) {
    console.error("Flutterwave account resolve error:", error);
    
    return NextResponse.json(
      { message: "Verification service unavailable. Please try again." },
      { status: 500 }
    );
  }
}
