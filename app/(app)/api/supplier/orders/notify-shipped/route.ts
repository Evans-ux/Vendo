/**
 * POST /api/supplier/orders/notify-shipped
 *
 * Called when supplier marks an order as SHIPPED.
 * Sends a Telegram message to the customer with a "✅ I Received It" button.
 * Body: { orderId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const TELEGRAM_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim()

async function sendTelegramMessage(telegramId: string, text: string, replyMarkup?: object) {
  if (!TELEGRAM_TOKEN || !telegramId) return
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
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })

    const { orderId } = await request.json()
    if (!orderId) return NextResponse.json({ message: 'orderId required' }, { status: 400 })

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { telegramId: true, name: true } },
        items: {
          include: { product: { select: { name: true, supplierId: true } } },
        },
      },
    })

    if (!order) return NextResponse.json({ message: 'Order not found' }, { status: 404 })

    // Verify this supplier owns the order
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { supplier: true },
    })
    const supplierId = dbUser?.supplier?.id
    const ownsOrder = order.items.some(i => i.product.supplierId === supplierId)
    if (!ownsOrder) return NextResponse.json({ message: 'Unauthorized' }, { status: 403 })

    const orderNumber = (order as any).orderNumber || order.id.slice(0, 8).toUpperCase()
    const productNames = order.items.map(i => i.product.name).join(', ')

    // Notify customer with "I Received It" button
    if (order.user.telegramId) {
      await sendTelegramMessage(
        order.user.telegramId,
        `🚚 *Your order has been shipped!*\n\n` +
        `Order *#${orderNumber}*\n` +
        `Items: ${productNames}\n\n` +
        `Your item is on its way! Once you receive it, please tap the button below to confirm delivery. ` +
        `This releases payment to the supplier. 🙏`,
        {
          inline_keyboard: [[
            { text: '✅ I Received My Order', callback_data: `received:${orderId}` }
          ]]
        }
      )
    }

    return NextResponse.json({ success: true, message: 'Customer notified' })
  } catch (err: any) {
    console.error('Notify shipped error:', err)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
