/**
 * POST /api/flutterwave/webhook
 *
 * Flutterwave sends server-to-server events here.
 * Register this URL in your Flutterwave dashboard:
 * https://vendo.com.ng/api/flutterwave/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/flutterwave'

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()

// ── Send a Telegram message to a user by their telegramId ─────────────────────
async function sendTelegramMessage(
  telegramId: string,
  text: string,
  replyMarkup?: object
) {
  if (!TELEGRAM_TOKEN || !telegramId) return
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: telegramId,
        text,
        parse_mode: 'Markdown',
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    })
  } catch (err) {
    console.error('Telegram notify error:', err)
  }
}

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

  // ── charge.completed = successful payment ─────────────────────────────────
  if (event.event === 'charge.completed' && event.data?.status === 'successful') {
    const transactionId = String(event.data.id)
    const txRef: string = event.data.tx_ref

    try {
      const transaction = await verifyTransaction(transactionId)

      if (transaction.status === 'successful') {
        const order = await prisma.order.findFirst({
          where: { paymentRef: txRef },
          include: {
            user: { select: { telegramId: true, name: true } },
            items: {
              include: {
                product: {
                  select: { name: true, supplierId: true },
                },
              },
            },
          },
        })

        if (order && order.paymentStatus !== 'PAID') {
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
          })
          console.log(`Order ${order.id} marked PAID via webhook`)

          const orderNumber = (order as any).orderNumber || order.id.slice(0, 8).toUpperCase()
          const productNames = order.items.map(i => i.product.name).join(', ')

          // ── Notify customer on Telegram ──────────────────────────────────
          if (order.user.telegramId) {
            await sendTelegramMessage(
              order.user.telegramId,
              `✅ *Payment Confirmed!*\n\n` +
              `Order *#${orderNumber}* has been paid.\n` +
              `Items: ${productNames}\n\n` +
              `The supplier has been notified and will prepare your item. ` +
              `I'll update you when it's shipped! 🚚\n\n` +
              `Type /orders to track your order.`
            )
          }
        }
      }
    } catch (err) {
      console.error('Flutterwave webhook verification error:', err)
    }
  }

  // ── transfer.completed = supplier payout succeeded ────────────────────────
  if (event.event === 'transfer.completed') {
    const reference = event.data?.reference
    console.log('Supplier payout completed:', reference)

    if (reference) {
      try {
        const withdrawal = await prisma.withdrawalRequest.findFirst({
          where: { flwReference: reference },
          include: { supplier: { include: { user: true } } },
        })

        if (withdrawal) {
          await prisma.withdrawalRequest.update({
            where: { id: withdrawal.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          })
          console.log(`Withdrawal ${withdrawal.id} marked COMPLETED`)
        }
      } catch (err) {
        console.error('Withdrawal update error:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}
