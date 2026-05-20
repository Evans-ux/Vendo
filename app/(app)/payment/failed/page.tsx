import Link from 'next/link'

const REASON_MESSAGES: Record<string, string> = {
  missing_params: 'Payment reference was missing. Please try again.',
  order_not_found: 'We could not find your order. Please contact support.',
  verification_error: 'We could not verify your payment. If money was deducted, contact support.',
  no_reference: 'No payment reference found.',
}

export default async function PaymentFailedPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; reason?: string }>
}) {
  const { orderId, reason } = await searchParams
  const message = reason ? REASON_MESSAGES[reason] : 'Your payment was not completed.'

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl border border-border card-shadow-lg p-8 text-center">
          {/* X icon */}
          <div className="w-20 h-20 rounded-full bg-red-500/15 border-2 border-red-500/40 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Payment Failed</h1>
          <p className="text-muted-foreground mb-8">{message}</p>

          <div className="space-y-3">
            {orderId && (
              <Link
                href={`/api/flutterwave/initialize`}
                className="block w-full py-3 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl transition-colors"
              >
                Try Again
              </Link>
            )}
            <Link
              href="/"
              className="block w-full py-3 border border-border text-muted hover:text-foreground hover:bg-surface font-medium rounded-xl transition-colors"
            >
              Back to Home
            </Link>
          </div>

          <p className="text-xs text-muted mt-6">
            If you were charged and your order wasn't confirmed, please contact{' '}
            <a href="mailto:support@vendo.ng" className="text-brand-orange underline">
              support@vendo.ng
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
