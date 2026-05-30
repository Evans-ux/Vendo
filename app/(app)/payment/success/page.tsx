import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>
}) {
  const { orderId } = await searchParams

  let order = null
  if (orderId) {
    order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { name: true, imageUrls: true } } } },
      },
    })
  }

  const orderNumber = (order as any)?.orderNumber || order?.id?.slice(0, 8).toUpperCase()

  return (
    // No layout wrapper — this is a standalone page, no navbar
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-3xl border border-border card-shadow-lg p-8 text-center">

          {/* Checkmark */}
          <div className="w-20 h-20 rounded-full bg-green-500/15 border-2 border-green-500/40 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">Payment Successful!</h1>
          {orderNumber && (
            <p className="text-sm font-semibold text-brand-orange mb-1">Order #{orderNumber}</p>
          )}
          <p className="text-muted mb-6">
            Your order has been confirmed. The supplier will prepare your items shortly.
          </p>

          {order && (
            <div className="bg-surface rounded-2xl border border-border p-4 mb-6 text-left">
              <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Order Summary
              </p>
              <div className="space-y-2">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {item.product.imageUrls[0] && (
                      <img
                        src={item.product.imageUrls[0]}
                        alt={item.product.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-muted">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold text-brand-orange">
                      ₦{Number(item.unitPrice).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-3 pt-3 flex justify-between">
                <span className="text-sm text-muted">Total paid</span>
                <span className="font-bold text-foreground">
                  ₦{Number(order.totalAmount).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {/* What happens next */}
          <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm font-semibold text-brand-orange mb-2">What happens next?</p>
            <ol className="space-y-1.5 text-sm text-muted">
              <li className="flex gap-2"><span className="text-brand-orange font-bold">1.</span> Supplier prepares your item</li>
              <li className="flex gap-2"><span className="text-brand-orange font-bold">2.</span> Item is dispatched to you</li>
              <li className="flex gap-2"><span className="text-brand-orange font-bold">3.</span> Confirm receipt on Telegram to release payment to supplier</li>
            </ol>
          </div>

          <div className="space-y-3">
            <p className="text-xs text-muted">
              Track your order by messaging <strong>@VeeVendo_bot</strong> on Telegram and typing /orders
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
