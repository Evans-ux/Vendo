import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

const SENDBOX_BASE = 'https://api.sendbox.co';

async function sendboxRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SENDBOX_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.SENDBOX_API_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sendbox API error ${res.status}: ${err}`);
  }

  return res.json();
}

/**
 * POST /api/sendbox/cheapest-rate
 * Body: { category: string }
 * Returns the cheapest courier rate for the given category using default weight/dimensions.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { category } = await request.json();
    if (!category) return NextResponse.json({ error: 'Category is required' }, { status: 400 });

    // Retrieve supplier address (pickup) from the logged‑in user
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { supplier: true },
    });
    if (!dbUser?.supplier?.address) {
      return NextResponse.json({ error: 'Supplier address not set' }, { status: 422 });
    }

    // Use a placeholder delivery address; in real flow this will be the customer address.
    const placeholderDelivery = process.env.DEFAULT_DELIVERY_ADDRESS || '123 Main St, Lagos, Nigeria';

    const payload = {
      pickup_address: dbUser.supplier.address,
      pickup_state: dbUser.supplier.state ?? 'Lagos',
      delivery_address: placeholderDelivery,
      weight: 0.5, // kg
      length: 20,
      width: 15,
      height: 10,
    };

    const rates = await sendboxRequest('/v1/shipments/rates', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (!Array.isArray(rates) || rates.length === 0) {
      return NextResponse.json({ error: 'No rates returned from Sendbox' }, { status: 500 });
    }

    // Find the cheapest rate
    const cheapest = rates.reduce((best: any, cur: any) => (cur.price < best.price ? cur : best), rates[0]);

    return NextResponse.json({
      price: cheapest.price,
      courierId: cheapest.courier_id ?? cheapest.courier?.id ?? null,
      estimatedDeliveryTime: cheapest.estimated_delivery_time || null,
      allRates: rates,
    });
  } catch (error: any) {
    console.error('Cheapest rate error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
