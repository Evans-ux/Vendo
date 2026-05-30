/**
 * POST /api/supplier/settings/pin/confirm-reset
 *
 * Resets the withdrawal PIN for a supplier who has clicked the recovery email link
 * and is currently logged in via a recovery session.
 * Body: { newPin: string, confirmPin: string }
 *
 * Because the recovery link automatically authenticates the user, we can verify
 * their active session, validate the PIN strength, and update the PIN without
 * requiring the forgotten current PIN.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { message: "Session expired or invalid. Please request a new reset link." },
        { status: 401 }
      );
    }

    const { newPin, confirmPin } = await request.json().catch(() => ({}));

    if (!newPin || !confirmPin) {
      return NextResponse.json({ message: "PIN and confirmation are required" }, { status: 400 });
    }

    const pinStr = String(newPin);
    if (!/^\d{4}$/.test(pinStr)) {
      return NextResponse.json({ message: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    if (pinStr !== String(confirmPin)) {
      return NextResponse.json({ message: "PINs do not match" }, { status: 400 });
    }

    // Enforce PIN strength (no repeating or simple sequential sequences)
    const repeats = ["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999"];
    const sequentials = [
      "1234", "2345", "3456", "4567", "5678", "6789", "0123",
      "4321", "3210", "9876", "8765", "7654", "6543", "5432"
    ];

    if (repeats.includes(pinStr)) {
      return NextResponse.json({ message: "Weak PIN: Repeating numbers are not allowed." }, { status: 400 });
    }
    if (sequentials.includes(pinStr)) {
      return NextResponse.json({ message: "Weak PIN: Sequential numbers are not allowed." }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    });

    if (!supplier) {
      return NextResponse.json({ message: "Supplier profile not found" }, { status: 404 });
    }

    // Hash the new PIN
    const hashedPin = await bcrypt.hash(pinStr, 12);

    // Update the supplier's PIN
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { withdrawalPin: hashedPin },
    });

    return NextResponse.json({
      success: true,
      message: "PIN has been reset successfully. You can now use your new PIN.",
    });
  } catch (error: any) {
    console.error("[Confirm PIN Reset] Error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
