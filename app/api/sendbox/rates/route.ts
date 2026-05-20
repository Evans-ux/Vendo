/**
 * GET /api/sendbox/rates?orderId=xxx
 *
 * Fetches available couriers + prices from Sendbox for a given order.
 * Called from the supplier dashboard when they confirm an order and
 * need to pick a courier.
 *
 * Sendbox needs:
 *   - pickup address (supplier's address)
 *   - delivery address (customer's address from the order)
 *   - package weight + dimensions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const SENDBOX_BASE = 'https://api.sendbox.co'

async function sendboxRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SENDBOX_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${process.env.SENDBOX_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sendbox API error ${res.status}: ${err}`)
  }

  return res.json()
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const orderId = request.nextUrl.searchParams.get('orderId')
    if (!orderId) return NextResponse.json({ error: 'orderId is required' }, { status: 400 })

    // Load order + supplier address + customer address
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { name: true, phone: true } },
        items: {
          include: {
            product: {
              include: {
                supplier: {
                  select: { address: true, state: true, phone: true, businessName: true },
                },
              },
            },
          },
        },
      },
    })

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const supplier = order.items[0]?.product?.supplier
    if (!supplier?.address) {
      return NextResponse.json(
        { error: 'Supplier has no pickup address set. Ask them to update their profile.' },
        { status: 422 }
      )
    }

    if (!order.deliveryAddress) {
      return NextResponse.json(
        { error: 'Order has no delivery address' },
        { status: 422 }
      )
    }

    // Fetch rates from Sendbox
    // Sendbox rate endpoint: POST /v1/shipments/rates
    const ratesPayload = {
      pickup_address: supplier.address,
      pickup_state: supplier.state ?? 'Lagos',
      delivery_address: order.deliveryAddress,
      // Weight in kg — default 0.5kg if not specified on product
      weight: 0.5,
      // Package dimensions in cm
      length: 20,
      width: 15,
      height: 10,
    }

    const rates = await sendboxRequest('/v1/shipments/rates', {
      method: 'POST',
      body: JSON.stringify(ratesPayload),
    })

    return NextResponse.json({ rates, orderId })
  } catch (error: any) {
    console.error('Sendbox rates error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
