/**
 * POST /api/sendbox/shipments
 *
 * Creates a Sendbox shipment after the supplier picks a courier from the rates list.
 * Body: { orderId, courierId, courierName }
 *
 * On success:
 *   - Sendbox returns a shipment ID + tracking number
 *   - We store both on the Order record
 *   - Order status moves to CONFIRMED (awaiting pickup)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SENDBOX_BASE = 'https://api.sendbox.co'

async function sendboxRequest(path: string, body: object) {
  const res = await fetch(`${SENDBOX_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDBOX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sendbox API error ${res.status}: ${err}`)
  }

  return res.json()
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { orderId, courierId, courierName } = await request.json()

    if (!orderId || !courierId) {
      return NextResponse.json({ error: 'orderId and courierId are required' }, { status: 400 })
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, phone: true } },
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: {
                    address: true,
                    state: true,
                    phone: true,
                    businessName: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const supplier = order.items[0]?.product?.supplier

    // Build shipment payload for Sendbox
    const shipmentPayload = {
      courier_id: courierId,
      pickup_address: supplier?.address,
      pickup_state: supplier?.state ?? 'Lagos',
      pickup_name: supplier?.businessName,
      pickup_phone: supplier?.phone,
      delivery_address: order.deliveryAddress,
      delivery_name: order.user?.name,
      delivery_phone: order.user?.phone,
      description: order.items.map(i => i.product.name).join(', '),
      weight: 0.5,
      amount: Number(order.totalAmount),
      // Sendbox needs a reference they can echo back in webhooks
      reference: order.id,
    }

    const shipment = await sendboxRequest('/v1/shipments', shipmentPayload)

    // Store the Sendbox shipment ID and tracking number on the order
    await prisma.order.update({
      where: { id: orderId },
      data: {
        sendboxShipmentId: shipment.id ?? shipment.shipment_id,
        trackingNumber: shipment.tracking_number ?? shipment.tracking_code,
        courierName: courierName ?? shipment.courier?.name,
        logisticsProvider: 'SENDBOX',
        logisticsStatus: 'shipment.created',
        status: 'CONFIRMED',
      },
    })

    return NextResponse.json({
      success: true,
      shipmentId: shipment.id,
      trackingNumber: shipment.tracking_number,
    })
  } catch (error: any) {
    console.error('Sendbox shipment creation error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
