/**
 * POST /api/supplier/wallet/confirm-delivery
 *
 * Called by Vee AI (Telegram/WhatsApp bot) when a customer confirms delivery.
 * Requires a shared internal secret so only the bot can call this.
 *
 * Body: { orderId: string }
 *
 * Flow:
 *  1. Mark order as DELIVERED
 *  2. For each order item, credit the supplier's wallet with basePrice
 *  3. Create EarningsTransaction (PENDING — 24hr dispute window)
 *  4. Schedule availableAt = now + 24hrs
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request: NextRequest) {
  // Verify internal secret — only the Vee AI bot should call this
  const authHeader = request.headers.get("x-internal-secret");
  if (!INTERNAL_SECRET || authHeader !== INTERNAL_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json({ message: "orderId is required" }, { status: 400 });
    }

    // Load order with items and their suppliers
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { supplier: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ message: "Order not found" }, { status: 404 });
    }

    if (order.status === "DELIVERED") {
      return NextResponse.json({ message: "Order already marked as delivered" }, { status: 400 });
    }

    if (order.paymentStatus !== "PAID") {
      return NextResponse.json({ message: "Order has not been paid" }, { status: 400 });
    }

    const availableAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hrs from now

    // Group items by supplier so we can credit each supplier once per order
    const supplierEarnings = new Map<
      string,
      { supplierId: string; amount: number; orderNumber: string }
    >();

    for (const item of order.items) {
      const supplierId = item.product.supplierId;
      // Supplier earns basePrice (we keep the 10% markup as commission)
      const earning = Number(item.product.basePrice) * item.quantity;

      // Deduct logistics fee if platform logistics
      const logisticsFee =
        item.product.deliveryMethod === "PLATFORM_LOGISTICS"
          ? Number(item.product.logisticsFee ?? 0)
          : 0;

      const net = earning - logisticsFee;

      if (supplierEarnings.has(supplierId)) {
        supplierEarnings.get(supplierId)!.amount += net;
      } else {
        supplierEarnings.set(supplierId, {
          supplierId,
          amount: net,
          orderNumber: (order as any).orderNumber ?? order.id.slice(0, 8).toUpperCase(),
        });
      }
    }

    // Run everything in a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Mark order DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" },
      });

      // 2. Credit each supplier
      for (const [, { supplierId, amount, orderNumber }] of supplierEarnings) {
        if (amount <= 0) continue;

        // Create earnings transaction (PENDING — 24hr window)
        await tx.earningsTransaction.create({
          data: {
            supplierId,
            type: "CREDIT",
            status: "PENDING",
            amount,
            description: `Order #${orderNumber} delivered — awaiting 24hr confirmation`,
            orderId,
            availableAt,
          },
        });

        // Update totalEarned (lifetime counter — never decremented)
        await tx.supplier.update({
          where: { id: supplierId },
          data: {
            totalEarned: { increment: amount },
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Delivery confirmed. Earnings are pending 24hr dispute window.",
      availableAt: availableAt.toISOString(),
    });
  } catch (error: any) {
    console.error("Confirm delivery error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
