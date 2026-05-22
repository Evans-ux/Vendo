/**
 * POST /api/flutterwave/initialize
 *
 * Creates a Flutterwave payment link for a customer order.
 * Body: { orderId }
 *
 * Returns: { payment_link } — redirect the customer here to pay.
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
          include: { product: { select: { name: true } } },
        },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if (order.paymentStatus === 'PAID') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vendo-nu.vercel.app'
    const txRef = `vendo_${order.id}_${Date.now()}`
    const productNames = order.items.map(i => i.product.name).join(', ')

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
    })

    // Store the tx_ref so we can match it in the callback/webhook
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
