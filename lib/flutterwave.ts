/**
 * lib/flutterwave.ts
 *
 * Flutterwave client helper.
 *
 * Test mode:       set FLW_MODE=test  (default)
 * Production mode: set FLW_MODE=production
 *
 * To switch to live: change FLW_MODE=production in your env and
 * fill in FLW_SECRET_KEY_LIVE + NEXT_PUBLIC_FLW_PUBLIC_KEY_LIVE.
 */

const isProduction = process.env.FLW_MODE === 'production'

export const FLW_SECRET_KEY = isProduction
  ? process.env.FLW_SECRET_KEY_LIVE!
  : process.env.FLW_SECRET_KEY_TEST!

export const FLW_PUBLIC_KEY = isProduction
  ? process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY_LIVE!
  : process.env.NEXT_PUBLIC_FLW_PUBLIC_KEY_TEST!

export const FLW_ENCRYPTION_KEY = isProduction
  ? process.env.FLW_ENCRYPTION_KEY_LIVE!
  : process.env.FLW_ENCRYPTION_KEY_TEST!

const FLW_BASE = 'https://api.flutterwave.com/v3'

async function flwRequest<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const json = await res.json()

  if (!res.ok || json.status !== 'success') {
    throw new Error(json.message ?? `Flutterwave error ${res.status}`)
  }

  return json.data as T
}

/**
 * Initialize a Flutterwave payment.
 * Returns the payment link to redirect the customer to.
 */
export async function initializePayment(params: {
  tx_ref: string          // your unique transaction reference
  amount: number          // in naira
  currency?: string       // default NGN
  redirect_url: string    // where Flutterwave redirects after payment
  customer: {
    email: string
    name?: string
    phone_number?: string
  }
  meta?: Record<string, any>
  customizations?: {
    title?: string
    description?: string
    logo?: string
  }
}) {
  return flwRequest<{ link: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      currency: 'NGN',
      ...params,
    }),
  })
}

/**
 * Verify a Flutterwave transaction by transaction ID.
 */
export async function verifyTransaction(transactionId: string) {
  return flwRequest<{
    status: string          // 'successful' | 'failed' | 'pending'
    tx_ref: string
    amount: number
    currency: string
    customer: { email: string; name: string }
    meta: Record<string, any>
  }>(`/transactions/${transactionId}/verify`)
}
