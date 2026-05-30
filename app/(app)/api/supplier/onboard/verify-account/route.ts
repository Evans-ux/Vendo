import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const FLW_SECRET = (
  process.env.FLW_MODE === "production"
    ? process.env.FLW_SECRET_KEY_LIVE
    : process.env.FLW_SECRET_KEY_TEST
)?.trim();

export async function GET(request: NextRequest) {
  try {
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

    if (!FLW_SECRET) {
      return NextResponse.json(
        { message: "Flutterwave secret key is missing" },
        { status: 500 }
      );
    }

    const flutterwaveResponse = await fetch(
       "https://api.flutterwave.com/v3/accounts/resolve",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number,
          account_bank,
        }),
      }
    );

    const rawResponse = await flutterwaveResponse.text();

    let data: any;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      console.error(
        "Flutterwave returned non-json response:",
        rawResponse.substring(0, 500)
      );

      return NextResponse.json(
        {
          message: "Flutterwave returned an invalid response",
          provider_response: rawResponse.substring(0, 200),
        },
        { status: 500 }
      );
    }

    if (
      !flutterwaveResponse.ok ||
      data.status?.toLowerCase() !== "success"
    ) {
      console.error("Flutterwave verification error:", data);

      return NextResponse.json(
        {
          message:
            data.message ||
            "Could not verify account. Check details and try again.",
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
      {
        message: "Verification service unavailable",
      },
      { status: 500 }
    );
  }
}