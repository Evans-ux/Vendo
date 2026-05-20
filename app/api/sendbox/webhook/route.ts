/**
 * POST /api/sendbox/webhook
 *
 * Sendbox calls this URL when a shipment status changes.
 * Registered at: https://vendo-nu.vercel.app/api/sendbox/webhook
 *
 * Sendbox signs each request with HMAC-SHA512 using your webhook secret.
 * We verify the signature before processing anything.
 *
 * Sendbox event types we handle:
 *   shipment.picked_up     → order status: CONFIRMED (in transit)
 *   shipment.in_transit    → order status: SHIPPED
 *   shipment.delivered     → order status: DELIVERED
 *   shipment.failed        → order status: CANCELLED (delivery failed)
 *   shipment.returned      → order status: CANCELLED (returned to sender)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'crypto'
import { prisma } from '@/lib/prisma'

// Map Sendbox event types → our OrderStatus values
const SENDBOX_STATUS_MAP: Record<string, string> = {
  'shipment.picked_up': 'CONFIRMED',
  'shipment.in_transit': 'SHIPPED',
  'shipment.out_for_delivery': 'SHIPPED',
  'shipment.delivered': 'DELIVERED',
  'shipment.failed': 'CANCELLED',
  'shipment.returned': 'CANCELLED',
}

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.SENDBOX_WEBHOOK_SECRET
  if (!secret) {
    console.error('SENDBOX_WEBHOOK_SECRET is not set')
    return false
  }
  const expected = createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex')
  return expected === signature
}

export async function POST(request: NextRequest) {
  // Read raw body for signature verification — must happen before any parsing
  const rawBody = await request.text()

  const signature = request.headers.get('x-sendbox-signature') ?? ''

  if (!verifySignature(rawBody, signature)) {
    console.warn('Sendbox webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: any
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { event, data } = payload

  // Log every event for debugging
  console.log('Sendbox webhook received:', event, JSON.stringify(data, null, 2))

  // We only care about shipment events
  if (!event?.startsWith('shipment.')) {
    return NextResponse.json({ received: true })
  }

  const shipmentId: string | undefined = data?.id ?? data?.shipment_id
  const trackingNumber: string | undefined = data?.tracking_number ?? data?.tracking_code
  const courierName: string | undefined = data?.courier?.name ?? data?.carrier

  if (!shipmentId) {
    console.warn('Sendbox webhook: no shipment ID in payload')
    return NextResponse.json({ received: true })
  }

  // Find the order linked to this Sendbox shipment
  const order = await prisma.order.findFirst({
    where: { sendboxShipmentId: shipmentId },
  })

  if (!order) {
    // Could be a test event or a shipment we don't know about yet — not an error
    console.warn(`Sendbox webhook: no order found for shipment ${shipmentId}`)
    return NextResponse.json({ received: true })
  }

  const newStatus = SENDBOX_STATUS_MAP[event]

  await prisma.order.update({
    where: { id: order.id },
    data: {
      ...(newStatus && { status: newStatus as any }),
      ...(trackingNumber && { trackingNumber }),
      ...(courierName && { courierName }),
      logisticsStatus: event,
    },
  })

  console.log(`Order ${order.id} updated: ${event} → status: ${newStatus ?? 'unchanged'}`)

  // TODO: trigger Telegram notification to customer here
  // e.g. await notifyCustomer(order.userId, event, trackingNumber)

  return NextResponse.json({ received: true })
}
