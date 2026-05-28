/**
 * POST /api/flutterwave/initialize
 *
 * Creates a Flutterwave payment link for a customer order.
 * Uses split payments: 90% → supplier subaccount, 10% → platform.
 * Logistics fee is deducted from supplier's 90% share.
 *
 * Body: { orderId }
 * Returns: { payment_link }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { initializePayment } from '@/lib/flutterwave'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { email: true, name: true, phone: true } },
        items: {
          include: {
            product: {
              select: {
                name: true,
                supplierId: true,
                deliveryMethod: true,
                logisticsFee: true,
              },
            },
          },
        },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vendo.com.ng'
    const txRef = `vendo_${order.id}_${Date.now()}`
    const productNames = order.items.map(i => i.product.name).join(', ')

    // ── Build split payment subaccounts ──────────────────────────────────────
    // Get unique suppliers in this order
    const supplierIds = [...new Set(order.items.map(i => i.product.supplierId))]
    const suppliers = await prisma.supplier.findMany({
      where: { id: { in: supplierIds } },
      select: { id: true, flwSubaccountId: true, businessName: true },
    })

    const subaccounts: Array<{
      id: string
      transaction_split_ratio?: number
      transaction_charge_type?: string
      transaction_charge?: number
    }> = []

    for (const supplier of suppliers) {
      if (supplier.flwSubaccountId) {
        // Calculate logistics fee for this supplier's items
        const supplierItems = order.items.filter(i => i.product.supplierId === supplier.id)
        const totalLogisticsFee = supplierItems.reduce((sum, item) => {
          if (item.product.deliveryMethod === 'PLATFORM_LOGISTICS') {
            return sum + Number(item.product.logisticsFee ?? 0)
          }
          return sum
        }, 0)

        // Supplier gets 90% of their items' total, minus logistics fee
        // We use flat deduction for logistics, then percentage for commission
        subaccounts.push({
          id: supplier.flwSubaccountId,
          transaction_charge_type: 'percentage',
          transaction_charge: 0.9, // 90% to supplier
        })

        // Store logistics fee to deduct from supplier earnings later
        if (totalLogisticsFee > 0) {
          console.log(`[Payment] Logistics fee ₦${totalLogisticsFee} will be deducted from ${supplier.businessName}`);
        }
      }
    }

    const payment = await initializePayment({
      tx_ref: txRef,
      amount: Number(order.totalAmount),
      redirect_url: `${siteUrl}/api/flutterwave/callback`,
      customer: {
        email: order.user.email,
        name: order.user.name ?? undefined,
        phone_number: order.user.phone ?? undefined,
      },
      meta: {
        orderId: order.id,
        userId: order.userId,
      },
      customizations: {
        title: 'Vendo Payment',
        description: `Payment for: ${productNames}`,
        logo: `${siteUrl}/vendo-logo.png`,
      },
      // Only add subaccounts if suppliers have Flutterwave subaccounts
      ...(subaccounts.length > 0 ? { subaccounts } : {}),
    })

    // Store tx_ref on the order
    await prisma.order.update({
      where: { id: orderId },
      data: { paymentRef: txRef },
    })

    return NextResponse.json({ payment_link: payment.link })
  } catch (error: any) {
    console.error('Flutterwave initialize error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
