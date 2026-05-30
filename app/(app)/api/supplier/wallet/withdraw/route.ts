/**
 * POST /api/supplier/wallet/withdraw
 *
 * Initiates a withdrawal/transfer for a supplier.
 * Body: { amount: number, pin: string }
 *
 * Validates PIN (with rate-limiting/lockout), checks balance, creates a
 * WithdrawalRequest record (PROCESSING), and triggers a Flutterwave bank transfer.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";
import { initiateTransfer } from "@/lib/flutterwave";

// In-memory store for PIN attempt rate-limiting.
// For production serverless environments, a database or redis-based store is preferred,
// but an in-memory map serves as a robust process-level guard.
const pinAttempts = new Map<string, { count: number; lockedUntil: Date }>();

const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { amount, pin } = body;

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      return NextResponse.json({ message: "Invalid withdrawal amount" }, { status: 400 });
    }

    if (!pin) {
      return NextResponse.json({ message: "PIN is required" }, { status: 400 });
    }

    // Fetch supplier details
    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    });

    if (!supplier) {
      return NextResponse.json({ message: "Supplier profile not found" }, { status: 404 });
    }

    const supplierId = supplier.id;

    // Check rate-limiting/lockout
    const now = new Date();
    const attemptInfo = pinAttempts.get(supplierId);

    if (attemptInfo && attemptInfo.lockedUntil > now) {
      const remainingTime = Math.ceil((attemptInfo.lockedUntil.getTime() - now.getTime()) / 1000 / 60);
      return NextResponse.json(
        { message: `Too many incorrect PIN attempts. Try again in ${remainingTime} minutes.` },
        { status: 429 }
      );
    }

    // Ensure PIN is configured
    if (!supplier.withdrawalPin) {
      return NextResponse.json(
        { message: "Withdrawal PIN has not been set. Please configure it in Settings first." },
        { status: 400 }
      );
    }

    // Verify PIN
    const isPinValid = await bcrypt.compare(String(pin), supplier.withdrawalPin);

    if (!isPinValid) {
      // Record failure and increment attempts
      const currentCount = attemptInfo ? attemptInfo.count + 1 : 1;
      if (currentCount >= MAX_ATTEMPTS) {
        pinAttempts.set(supplierId, {
          count: currentCount,
          lockedUntil: new Date(Date.now() + LOCK_DURATION_MS),
        });
        return NextResponse.json(
          { message: `Incorrect PIN. Maximum attempts reached. Account locked for 15 minutes.` },
          { status: 429 }
        );
      } else {
        pinAttempts.set(supplierId, {
          count: currentCount,
          lockedUntil: new Date(0), // not locked yet
        });
        return NextResponse.json(
          { message: `Incorrect PIN. ${MAX_ATTEMPTS - currentCount} attempts remaining.` },
          { status: 401 }
        );
      }
    }

    // Reset PIN attempts on successful login
    pinAttempts.delete(supplierId);

    // Validate balance
    const walletBalance = Number(supplier.walletBalance);
    if (walletBalance < withdrawAmount) {
      return NextResponse.json({ message: "Insufficient wallet balance" }, { status: 400 });
    }

    // Validate bank info is on file
    if (!supplier.bankCode || !supplier.accountNumber || !supplier.bankName || !supplier.accountHolderName) {
      return NextResponse.json(
        { message: "Payout bank account details are missing or incomplete. Update bank info first." },
        { status: 400 }
      );
    }

    // Create unique reference for Flutterwave transfer
    const flwReference = `vendo_wd_${supplierId.slice(0, 8)}_${Date.now()}`;

    // Perform database operations and initiate transfer
    const withdrawal = await prisma.$transaction(async (tx) => {
      // 1. Decrement supplier wallet balance immediately to prevent double-spending
      await tx.supplier.update({
        where: { id: supplierId },
        data: {
          walletBalance: { decrement: withdrawAmount },
        },
      });

      // 2. Create the WithdrawalRequest record
      return await tx.withdrawalRequest.create({
        data: {
          supplierId,
          amount: withdrawAmount,
          status: "PROCESSING",
          flwReference,
          bankName: supplier.bankName!,
          bankCode: supplier.bankCode!,
          accountNumber: supplier.accountNumber!,
          accountHolderName: supplier.accountHolderName!,
        },
      });
    });

    try {
      // Call Flutterwave Transfer API
      const transferRes = await initiateTransfer({
        account_bank: withdrawal.bankCode,
        account_number: withdrawal.accountNumber,
        amount: withdrawAmount,
        narration: `Vendo Supplier Payout - ${supplier.businessName}`,
        currency: "NGN",
        reference: flwReference,
        // Optional callback/webhook URL can be added here
      });

      if (transferRes && transferRes.id) {
        // Update withdrawal record with FLW transfer ID
        const finalStatus =
          transferRes.status?.toUpperCase() === "SUCCESSFUL"
            ? "COMPLETED"
            : "PROCESSING";

        await prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            flwTransferId: String(transferRes.id),
            status: finalStatus as any,
            completedAt: finalStatus === "COMPLETED" ? new Date() : null,
          },
        });

        return NextResponse.json({
          success: true,
          message: finalStatus === "COMPLETED" ? "Withdrawal completed successfully!" : "Withdrawal is processing.",
          withdrawalId: withdrawal.id,
          status: finalStatus,
        });
      } else {
        throw new Error("Invalid transfer response from Flutterwave");
      }
    } catch (apiErr: any) {
      console.error("[Withdrawal API] Flutterwave transfer failed:", apiErr.message);

      // Revert wallet balance & mark withdrawal request as FAILED
      await prisma.$transaction([
        prisma.supplier.update({
          where: { id: supplierId },
          data: { walletBalance: { increment: withdrawAmount } },
        }),
        prisma.withdrawalRequest.update({
          where: { id: withdrawal.id },
          data: {
            status: "FAILED",
            failureReason: apiErr.message || "Failed to initiate Flutterwave transfer",
          },
        }),
      ]);

      return NextResponse.json(
        { message: `Payout transfer failed: ${apiErr.message || "Please contact support"}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[Withdrawal Request Error]", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
