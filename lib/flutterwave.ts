/**
 * lib/flutterwave.ts
 *
 * Flutterwave client helper.
 * Mode switching: FLW_MODE=test (default) | FLW_MODE=production
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

// ─── Payment Initialization ───────────────────────────────────────────────────

export async function initializePayment(params: {
  tx_ref: string
  amount: number
  currency?: string
  redirect_url: string
  customer: { email: string; name?: string; phone_number?: string }
  meta?: Record<string, any>
  customizations?: { title?: string; description?: string; logo?: string }
  subaccounts?: Array<{ id: string; transaction_split_ratio?: number; transaction_charge_type?: string; transaction_charge?: number }>
}) {
  return flwRequest<{ link: string }>('/payments', {
    method: 'POST',
    body: JSON.stringify({ currency: 'NGN', ...params }),
  })
}

// ─── Transaction Verification ─────────────────────────────────────────────────

export async function verifyTransaction(transactionId: string) {
  return flwRequest<{
    status: string
    tx_ref: string
    amount: number
    currency: string
    customer: { email: string; name: string }
    meta: Record<string, any>
  }>(`/transactions/${transactionId}/verify`)
}

// ─── Subaccounts (Split Payments) ─────────────────────────────────────────────

/**
 * Create a Flutterwave subaccount for a supplier.
 * This enables automatic split payments — supplier's share goes directly to their subaccount.
 */
export async function createSubaccount(params: {
  account_bank: string   // bank code e.g. "058" for GTBank
  account_number: string
  business_name: string
  business_email?: string
  business_contact?: string
  business_contact_mobile?: string
  country: string        // "NG"
  split_type: 'percentage' | 'flat'
  split_value: number    // e.g. 0.90 for 90% or 1000 for flat ₦1000
}) {
  return flwRequest<{
    id: number
    account_number: string
    account_bank: string
    business_name: string
    split_type: string
    split_value: number
    subaccount_id: string
  }>('/subaccounts', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Fetch a subaccount by its ID.
 */
export async function getSubaccount(subaccountId: string) {
  return flwRequest(`/subaccounts/${subaccountId}`)
}

// ─── Transfers (Payouts) ──────────────────────────────────────────────────────

/**
 * Initiate a bank transfer (payout to supplier).
 */
export async function initiateTransfer(params: {
  account_bank: string
  account_number: string
  amount: number
  narration: string
  currency: string
  reference: string
  callback_url?: string
  debit_currency?: string
}) {
  return flwRequest<{
    id: number
    account_number: string
    bank_code: string
    full_name: string
    amount: number
    currency: string
    reference: string
    status: string
  }>('/transfers', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

/**
 * Verify a transfer status.
 */
export async function verifyTransfer(transferId: string) {
  return flwRequest(`/transfers/${transferId}`)
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

/**
 * Initiate a refund for a transaction.
 */
export async function initiateRefund(transactionId: string, amount?: number) {
  return flwRequest(`/transactions/${transactionId}/refund`, {
    method: 'POST',
    body: JSON.stringify(amount ? { amount } : {}),
  })
}
