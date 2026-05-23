/**
 * POST /api/supplier/settings/bank
 *
 * Update supplier bank account details.
 * Requires PIN verification + Flutterwave account re-verification.
 *
 * Body: {
 *   pin: string,
 *   bankCode: string,
 *   bankName: string,
 *   accountNumber: string,
 *   accountHolderName: string  // must come from Flutterwave verify-account
 * }
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

    const { pin, bankCode, bankName, accountNumber, accountHolderName } = await request.json();

    if (!pin || !bankCode || !bankName || !accountNumber || !accountHolderName) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 });
    }

    if (!/^\d{10}$/.test(String(accountNumber))) {
      return NextResponse.json({ message: "Account number must be 10 digits" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { userId: user.id } });
    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // PIN required to change bank details
    if (!supplier.withdrawalPin) {
      return NextResponse.json(
        { message: "Set a withdrawal PIN first before updating bank details" },
        { status: 400 }
      );
    }

    const pinValid = await bcrypt.compare(String(pin), supplier.withdrawalPin);
    if (!pinValid) {
      return NextResponse.json({ message: "Incorrect PIN" }, { status: 401 });
    }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        bankCode,
        bankName,
        accountNumber: String(accountNumber),
        accountHolderName,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Bank account updated successfully",
    });
  } catch (error: any) {
    console.error("Bank update error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
