/**
 * POST /api/supplier/settings/pin
 *
 * Set or change the supplier's 4-digit withdrawal PIN.
 *
 * Body (set new PIN):    { pin: string, confirmPin: string }
 * Body (change PIN):     { currentPin: string, pin: string, confirmPin: string }
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
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { currentPin, pin, confirmPin } = await request.json();

    if (!pin || !confirmPin) {
      return NextResponse.json({ message: "PIN and confirmation are required" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ message: "PIN must be exactly 4 digits" }, { status: 400 });
    }
    if (String(pin) !== String(confirmPin)) {
      return NextResponse.json({ message: "PINs do not match" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { userId: user.id } });
    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // If PIN already exists, require current PIN to change it
    if (supplier.withdrawalPin) {
      if (!currentPin) {
        return NextResponse.json(
          { message: "Current PIN is required to change your PIN" },
          { status: 400 }
        );
      }
      const valid = await bcrypt.compare(String(currentPin), supplier.withdrawalPin);
      if (!valid) {
        return NextResponse.json({ message: "Current PIN is incorrect" }, { status: 401 });
      }
    }

    const hashed = await bcrypt.hash(String(pin), 12);

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { withdrawalPin: hashed },
    });

    return NextResponse.json({
      success: true,
      message: supplier.withdrawalPin ? "PIN changed successfully" : "PIN set successfully",
    });
  } catch (error: any) {
    console.error("PIN update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
