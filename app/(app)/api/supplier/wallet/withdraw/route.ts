/**
 * POST /api/supplier/wallet/withdraw
 *
 * Supplier requests a payout from their available wallet balance.
 * Requires PIN verification.
 *
 * Body: { amount: number, pin: string }
 *
 * Flow:
 *  1. Verify PIN (bcrypt compare)
 *  2. Check available balance >= amount
 *  3. Debit wallet immediately (optimistic — prevents double-spend)
 *  4. Initiate Flutterwave transfer
 *  5. Create WithdrawalRequest record
 *  6. If Flutterwave fails, restore wallet balance
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

const FLW_SECRET =
  process.env.FLW_MODE === "production"
    ? process.env.FLW_SECRET_KEY_LIVE
    : process.env.FLW_SECRET_KEY_TEST;

const MIN_WITHDRAWAL = 1000; // ₦1,000 minimum

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { amount, pin } = await request.json();

    if (!amount || !pin) {
      return NextResponse.json({ message: "Amount and PIN are required" }, { status: 400 });
    }

    if (typeof amount !== "number" || amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { message: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}` },
        { status: 400 }
      );
    }

    if (!/^\d{4}$/.test(String(pin))) {
      return NextResponse.json({ message: "PIN must be 4 digits" }, { status: 400 });
    }

    // Load supplier
    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    });

    if (!supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // Check PIN is set
    if (!supplier.withdrawalPin) {
      return NextResponse.json(
        { message: "You must set a withdrawal PIN in Settings before withdrawing" },
        { status: 400 }
      );
    }

    // Verify PIN
    const pinValid = await bcrypt.compare(String(pin), supplier.withdrawalPin);
    if (!pinValid) {
      return NextResponse.json({ message: "Incorrect PIN" }, { status: 401 });
    }

    // Check bank details
    if (!supplier.bankCode || !supplier.accountNumber || !supplier.accountHolderName) {
      return NextResponse.json(
        { message: "Bank account details are incomplete. Update them in Settings." },
        { status: 400 }
      );
    }

    // Check available balance
    const available = Number(supplier.walletBalance);
    if (available < amount) {
      return NextResponse.json(
        { message: `Insufficient balance. Available: ₦${available.toLocaleString()}` },
        { status: 400 }
      );
    }

    const flwReference = `vendo_payout_${supplier.id}_${Date.now()}`;

    // Debit wallet immediately (prevents double-spend)
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: { walletBalance: { decrement: amount } },
    });

    // Initiate Flutterwave transfer
    let flwTransferId: string | null = null;
    let transferFailed = false;
    let failureReason = "";

    try {
      const transferRes = await fetch("https://api.flutterwave.com/v3/transfers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FLW_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_bank: supplier.bankCode,
          account_number: supplier.accountNumber,
          amount,
          narration: `Vendo payout — ${supplier.businessName}`,
          currency: "NGN",
          reference: flwReference,
          callback_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/flutterwave/transfer-webhook`,
          debit_currency: "NGN",
        }),
      });

      const transferData = await transferRes.json();

      if (!transferRes.ok || transferData.status !== "success") {
        transferFailed = true;
        failureReason = transferData.message || "Flutterwave transfer failed";
      } else {
        flwTransferId = String(transferData.data?.id ?? "");
      }
    } catch (err: any) {
      transferFailed = true;
      failureReason = err.message || "Network error initiating transfer";
    }

    if (transferFailed) {
      // Restore wallet balance
      await prisma.supplier.update({
        where: { id: supplier.id },
        data: { walletBalance: { increment: amount } },
      });

      return NextResponse.json(
        { message: `Transfer failed: ${failureReason}. Your balance has been restored.` },
        { status: 500 }
      );
    }

    // Create withdrawal record + debit earnings transaction
    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.create({
        data: {
          supplierId: supplier.id,
          amount,
          status: "PROCESSING",
          flwTransferId,
          flwReference,
          bankName: supplier.bankName!,
          bankCode: supplier.bankCode!,
          accountNumber: supplier.accountNumber!,
          accountHolderName: supplier.accountHolderName!,
        },
      });

      await tx.earningsTransaction.create({
        data: {
          supplierId: supplier.id,
          type: "DEBIT",
          status: "WITHDRAWN",
          amount,
          description: `Withdrawal of ₦${amount.toLocaleString()} to ${supplier.bankName} ${supplier.accountNumber}`,
          availableAt: new Date(),
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: `₦${amount.toLocaleString()} is being transferred to your ${supplier.bankName} account. This usually takes 1–3 minutes.`,
      reference: flwReference,
    });
  } catch (error: any) {
    console.error("Withdrawal error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
