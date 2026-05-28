/**
 * GET /api/flutterwave/callback
 *
 * Flutterwave redirects the customer here after payment.
 * Query params: ?status=successful&tx_ref=vendo_xxx&transaction_id=12345
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/flutterwave'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')
  const txRef = searchParams.get('tx_ref')
  const transactionId = searchParams.get('transaction_id')
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vendo.com.ng'

  if (!txRef || !transactionId) {
    return NextResponse.redirect(`${siteUrl}/payment/failed?reason=missing_params`)
  }

  // If Flutterwave already says it failed, skip verification
  if (status === 'cancelled' || status === 'failed') {
    const order = await prisma.order.findFirst({ where: { paymentRef: txRef } })
    return NextResponse.redirect(
      `${siteUrl}/payment/failed?orderId=${order?.id ?? ''}`
    )
  }

  try {
    const transaction = await verifyTransaction(transactionId)

    const order = await prisma.order.findFirst({ where: { paymentRef: txRef } })
    if (!order) {
      return NextResponse.redirect(`${siteUrl}/payment/failed?reason=order_not_found`)
    }

    if (transaction.status === 'successful') {
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
      })
      return NextResponse.redirect(`${siteUrl}/payment/success?orderId=${order.id}`)
    } else {
      return NextResponse.redirect(`${siteUrl}/payment/failed?orderId=${order.id}`)
    }
  } catch (error: any) {
    console.error('Flutterwave callback error:', error)
    return NextResponse.redirect(`${siteUrl}/payment/failed?reason=verification_error`)
  }
}
