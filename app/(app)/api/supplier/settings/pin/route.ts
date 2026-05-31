/**
 * POST /api/supplier/settings/pin
 *
 * Set or change the supplier's 4-digit withdrawal PIN.
 *
 * Setting for the first time: { pin, confirmPin }
 * Changing existing PIN:      { otp, pin, confirmPin }
 *   — otp is the 6-digit code emailed via /request-otp
 *
 * Sends a security notification email after every successful change.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { sendMail, pinChangedEmail } from "@/lib/mailer";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { otp, pin, confirmPin } = await request.json();

    // ── Validate new PIN ──────────────────────────────────────────────────
    if (!pin || !confirmPin) {
      return NextResponse.json({ message: "PIN and confirmation are required" }, { status: 400 });
    }
    const pinStr = String(pin);
    if (!/^\d{4}$/.test(pinStr)) {
      return NextResponse.json({ message: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    if (pinStr !== String(confirmPin)) {
      return NextResponse.json({ message: "PINs do not match" }, { status: 400 });
    }

    // Enforce PIN strength
    const repeats     = ["0000","1111","2222","3333","4444","5555","6666","7777","8888","9999"];
    const sequentials = ["1234","2345","3456","4567","5678","6789","0123","4321","3210","9876","8765","7654","6543","5432"];
    if (repeats.includes(pinStr)) {
      return NextResponse.json({ message: "Weak PIN: Repeating numbers are not allowed." }, { status: 400 });
    }
    if (sequentials.includes(pinStr)) {
      return NextResponse.json({ message: "Weak PIN: Sequential numbers are not allowed." }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
      include: { user: { select: { email: true } } },
    });
    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    const isNew = !supplier.withdrawalPin;

    // ── OTP verification (required when changing an existing PIN) ─────────
    if (!isNew) {
      if (!otp) {
        return NextResponse.json(
          { message: "A verification code is required to change your PIN. Click 'Send Code' first." },
          { status: 400 }
        );
      }

      if (!supplier.pinOtp || !supplier.pinOtpExpiresAt) {
        return NextResponse.json(
          { message: "No verification code found. Please request a new code." },
          { status: 400 }
        );
      }

      if (new Date() > supplier.pinOtpExpiresAt) {
        // Clear expired OTP
        await prisma.supplier.update({
          where: { id: supplier.id },
          data: { pinOtp: null, pinOtpExpiresAt: null },
        });
        return NextResponse.json(
          { message: "Verification code has expired. Please request a new one." },
          { status: 400 }
        );
      }

      const otpValid = await bcrypt.compare(String(otp), supplier.pinOtp);
      if (!otpValid) {
        return NextResponse.json({ message: "Incorrect verification code." }, { status: 401 });
      }
    }

    // ── Hash and save new PIN, clear OTP ─────────────────────────────────
    const hashed = await bcrypt.hash(pinStr, 12);

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        withdrawalPin:    hashed,
        pinOtp:           null,   // consume / clear OTP
        pinOtpExpiresAt:  null,
      },
    });

    // ── Send security notification email (fire-and-forget) ───────────────
    const timestamp = new Date().toLocaleString("en-NG", {
      timeZone:  "Africa/Lagos",
      dateStyle: "medium",
      timeStyle: "short",
    });
    const { subject, html } = pinChangedEmail({
      businessName: supplier.businessName,
      email:        supplier.user.email,
      isNew,
      timestamp,
    });
    sendMail({ to: supplier.user.email, subject, html }).catch((err) =>
      console.error("[PIN Route] Notification email error:", err)
    );

    return NextResponse.json({
      success: true,
      message: isNew ? "PIN set successfully" : "PIN changed successfully",
    });
  } catch (error: any) {
    console.error("PIN update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
