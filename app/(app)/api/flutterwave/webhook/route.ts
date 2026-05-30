/**
 * POST /api/flutterwave/webhook
 *
 * Handles ALL Flutterwave events:
 *   charge.completed (successful) → mark order PAID + CONFIRMED, notify customer
 *   charge.completed (failed)     → notify customer of failure
 *   transfer.completed            → mark WithdrawalRequest COMPLETED
 *   transfer.failed               → mark FAILED, restore supplier wallet balance
 *
 * Earnings are NOT credited here. They are credited when the customer confirms
 * delivery via POST /api/supplier/wallet/confirm-delivery, then released to
 * walletBalance after the 24hr dispute window by the release-pending cron job.
 *
 * Register this URL in your Flutterwave dashboard:
 *   https://vendo.com.ng/api/flutterwave/webhook
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyTransaction } from '@/lib/flutterwave'

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()

async function sendTelegramMessage(telegramId: string, text: string, replyMarkup?: object) {
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
  const hash = request.headers.get('verif-hash')
  const expectedHash = process.env.FLW_WEBHOOK_HASH

  if (!expectedHash || hash !== expectedHash) {
    console.warn('[Webhook] Invalid hash — rejected')
    return NextResponse.json({ error: 'Invalid hash' }, { status: 401 })
  }

  let event: any
  try {
    event = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  console.log('[Webhook] Event:', event.event, '| Status:', event.data?.status)

  // ── PAYMENT SUCCESS ───────────────────────────────────────────────────────
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
                product: { select: { name: true } },
              },
            },
          },
        })

        if (order && order.paymentStatus !== 'PAID') {
          const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase()

          // Mark order PAID + CONFIRMED.
          // Earnings are NOT credited here — they are credited when the customer
          // confirms delivery (confirm-delivery route), then released after 24hrs.
          await prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: 'PAID', status: 'CONFIRMED' },
          })

          console.log(`[Webhook] Order ${orderNumber} marked PAID`)

          // Notify customer on Telegram
          if (order.user.telegramId) {
            const productNames = order.items.map(i => i.product.name).join(', ')
            await sendTelegramMessage(
              order.user.telegramId,
              `✅ *Payment Confirmed!*\n\n` +
              `Order *#${orderNumber}* — ${productNames}\n\n` +
              `The supplier has been notified and will prepare your item. ` +
              `I'll update you when it's shipped! 🚚\n\n` +
              `Once you receive your order, please tap the button below to confirm receipt. This releases the payment to the supplier. 🙏\n\n` +
              `Type /orders to track your order.`,
              {
                inline_keyboard: [[
                  { text: '✅ I Received My Order', callback_data: `received:${order.id}` }
                ]]
              }
            )
          }
        }
      }
    } catch (err) {
      console.error('[Webhook] Payment verification error:', err)
    }
  }

  // ── PAYMENT FAILED ────────────────────────────────────────────────────────
  if (event.event === 'charge.completed' && event.data?.status === 'failed') {
    const txRef: string = event.data?.tx_ref
    if (txRef) {
      try {
        const order = await prisma.order.findFirst({
          where: { paymentRef: txRef },
          include: { user: { select: { telegramId: true } } },
        })

        if (order && order.paymentStatus === 'UNPAID') {
          const orderNumber = order.orderNumber || order.id.slice(0, 8).toUpperCase()

          if (order.user.telegramId) {
            await sendTelegramMessage(
              order.user.telegramId,
              `❌ *Payment Failed*\n\n` +
              `Your payment for order *#${orderNumber}* was not successful.\n\n` +
              `Please try again by typing /orders and selecting the order, or contact support.`
            )
          }
        }
      } catch (err) {
        console.error('[Webhook] Payment failed handler error:', err)
      }
    }
  }

  // ── SUPPLIER PAYOUT COMPLETED ─────────────────────────────────────────────
  if (event.event === 'transfer.completed') {
    const reference = event.data?.reference
    console.log('[Webhook] Transfer completed:', reference)

    if (reference) {
      try {
        const withdrawal = await prisma.withdrawalRequest.findFirst({
          where: { flwReference: reference },
        })

        if (withdrawal && withdrawal.status === 'PROCESSING') {
          await prisma.withdrawalRequest.update({
            where: { id: withdrawal.id },
            data: { status: 'COMPLETED', completedAt: new Date() },
          })
          console.log(`[Webhook] Withdrawal ${withdrawal.id} COMPLETED`)
        }
      } catch (err) {
        console.error('[Webhook] Transfer completed handler error:', err)
      }
    }
  }

  // ── SUPPLIER PAYOUT FAILED — restore wallet balance ───────────────────────
  if (event.event === 'transfer.failed') {
    const reference = event.data?.reference
    console.log('[Webhook] Transfer FAILED:', reference)

    if (reference) {
      try {
        const withdrawal = await prisma.withdrawalRequest.findFirst({
          where: { flwReference: reference },
          include: { supplier: true },
        })

        if (withdrawal && withdrawal.status === 'PROCESSING') {
          await prisma.$transaction(async (tx) => {
            // Mark withdrawal as failed
            await tx.withdrawalRequest.update({
              where: { id: withdrawal.id },
              data: {
                status: 'FAILED',
                failureReason: event.data?.complete_message || 'Transfer failed',
              },
            })

            // Restore wallet balance
            await tx.supplier.update({
              where: { id: withdrawal.supplierId },
              data: { walletBalance: { increment: Number(withdrawal.amount) } },
            })

            // Reversal credit entry for the ledger
            await tx.earningsTransaction.create({
              data: {
                supplierId: withdrawal.supplierId,
                type: 'CREDIT',
                status: 'AVAILABLE',
                amount: Number(withdrawal.amount),
                description: `Withdrawal reversal — transfer failed (ref: ${reference})`,
                availableAt: new Date(),
              },
            })
          })

          console.log(`[Webhook] Withdrawal ${withdrawal.id} FAILED — wallet restored`)
        }
      } catch (err) {
        console.error('[Webhook] Transfer failed handler error:', err)
      }
    }
  }

  // ── TRANSFER REVERSED ─────────────────────────────────────────────────────
  if (event.event === 'transfer.reversed') {
    const reference = event.data?.reference
    console.log('[Webhook] Transfer REVERSED:', reference)

    if (reference) {
      try {
        const withdrawal = await prisma.withdrawalRequest.findFirst({
          where: { flwReference: reference },
        })

        if (withdrawal && (withdrawal.status === 'PROCESSING' || withdrawal.status === 'COMPLETED')) {
          await prisma.$transaction(async (tx) => {
            await tx.withdrawalRequest.update({
              where: { id: withdrawal.id },
              data: {
                status: 'FAILED',
                failureReason: 'Transfer reversed by Flutterwave',
              },
            })

            await tx.supplier.update({
              where: { id: withdrawal.supplierId },
              data: { walletBalance: { increment: Number(withdrawal.amount) } },
            })

            await tx.earningsTransaction.create({
              data: {
                supplierId: withdrawal.supplierId,
                type: 'CREDIT',
                status: 'AVAILABLE',
                amount: Number(withdrawal.amount),
                description: `Withdrawal reversal — transfer reversed (ref: ${reference})`,
                availableAt: new Date(),
              },
            })
          })

          console.log(`[Webhook] Withdrawal ${withdrawal.id} REVERSED — wallet restored`)
        }
      } catch (err) {
        console.error('[Webhook] Transfer reversed handler error:', err)
      }
    }
  }

  return NextResponse.json({ received: true })
}






 