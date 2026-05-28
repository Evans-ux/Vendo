/**
 * POST /api/flutterwave/webhook
 *
 * Flutterwave sends server-to-server events here.
 * More reliable than the redirect callback — handles cases where
 * the customer closes the browser before being redirected.
 *
 * Register this URL in your Flutterwave dashboard:
 * https://vendo.com.ng/api/flutterwave/webhook
 *
 * Flutterwave signs requests with a secret hash in the
 * verif-hash header. Set FLW_WEBHOOK_HASH in your env.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/flutterwave'

export async function POST(request: NextRequest) {
  // Verify the webhook secret hash
  const hash = request.headers.get('verif-hash')
  const expectedHash = process.env.FLW_WEBHOOK_HASH

  if (!expectedHash || hash !== expectedHash) {
    console.warn('Flutterwave webhook: invalid hash')
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
  }

  let event: any
  try {
    event = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('Flutterwave webhook event:', event.event)

  // charge.completed = successful payment
  if (event.event === 'charge.completed' && event.data?.status === 'successful') {
    const transactionId = String(event.data.id)
    const txRef: string = event.data.tx_ref

    try {
      // Double-verify with Flutterwave API before marking as paid
      const transaction = await verifyTransaction(transactionId)

      if (transaction.status === 'successful') {
        const order = await prisma.order.findFirst({ where: { paymentRef: txRef } })

        if (order && order.paymentStatus !== 'PAID') {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
          })
          console.log(`Order ${order.id} marked PAID via webhook`)

          // TODO: notify supplier via Telegram/dashboard
          // TODO: trigger Sendbox shipment creation if PLATFORM_LOGISTICS
        }
      }
    } catch (err) {
      console.error('Flutterwave webhook verification error:', err)
    }
  }

  // transfer.completed = payout to supplier succeeded
  if (event.event === 'transfer.completed') {
    console.log('Supplier payout completed:', event.data?.reference)
    // TODO: update supplier payout record when payout system is built
  }

  return NextResponse.json({ received: true })
}
