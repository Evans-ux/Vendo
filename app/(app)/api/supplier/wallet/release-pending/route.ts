/**
 * POST /api/supplier/wallet/release-pending
 *
 * Cron job endpoint — called every hour (or via Vercel cron).
 * Moves PENDING earnings to AVAILABLE once the 24hr dispute window has passed.
 * Also credits the walletBalance so the supplier can withdraw.
 *
 * Protect with CRON_SECRET in production.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();

    // Find all PENDING earnings whose dispute window has passed
    const readyEarnings = await prisma.earningsTransaction.findMany({
      where: {
        status: "PENDING",
        availableAt: { lte: now },
      },
    });

    if (readyEarnings.length === 0) {
      return NextResponse.json({ message: "No pending earnings to release", released: 0 });
    }

    // Group by supplier
    const bySupplier = new Map<string, number>();
    for (const e of readyEarnings) {
      bySupplier.set(e.supplierId, (bySupplier.get(e.supplierId) ?? 0) + Number(e.amount));
    }

    await prisma.$transaction(async (tx) => {
      // Mark all as AVAILABLE
      await tx.earningsTransaction.updateMany({
        where: {
          id: { in: readyEarnings.map((e) => e.id) },
        },
        data: { status: "AVAILABLE" },
      });

      // Credit each supplier's walletBalance
      for (const [supplierId, amount] of bySupplier) {
        await tx.supplier.update({
          where: { id: supplierId },
          data: { walletBalance: { increment: amount } },
        });
      }
    });

    return NextResponse.json({
      success: true,
      released: readyEarnings.length,
      suppliersCredited: bySupplier.size,
    });
  } catch (error: any) {
    console.error("Release pending error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
