/**
 * POST /api/supplier/settings/pin/reset
 *
 * Requests a PIN reset link by triggering a Supabase Auth password recovery flow.
 * Body: { email: string }
 *
 * This sends a secure link via the Supabase SMTP provider (which the user
 * has configured with Resend) that automatically authenticates the user and
 * redirects them to the PIN reset confirmation page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vendo.com.ng";

    // Trigger Supabase password recovery flow.
    // This sends an email containing a link that handles authentication
    // and redirects the user to the destination page.
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${siteUrl}/supplier/settings/pin/confirm-reset`,
    });

    if (error) {
      console.error("[PIN Reset Request] Supabase error:", error.message);
      return NextResponse.json({ message: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "If the email is associated with a supplier account, a reset link has been sent.",
    });
  } catch (error: any) {
    console.error("[PIN Reset Request] Unexpected error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
