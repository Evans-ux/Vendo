"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OrderTimer from "@/components/supplier/OrderTimer";
import { updateOrderStatus, supplierCancelOrder } from "@/app/actions/supplier";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  deliveryAddress: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    size?: string;
    product: {
      id: string;
      name: string;
      imageUrls: string[];
      supplier: {
        supplierType: "LOCAL" | "DROPSHIP";
      };
    };
  }>;
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:    "bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  CONFIRMED:  "bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  PROCESSING: "bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-500/10 dark:text-purple-300 dark:border-purple-500/30",
  SHIPPED:    "bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30",
  DELIVERED:  "bg-green-100 text-green-800 border border-green-300 dark:bg-green-500/10 dark:text-green-300 dark:border-green-500/30",
  CANCELLED:  "bg-red-100 text-red-800 border border-red-300 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const PAYMENT_BADGE: Record<string, string> = {
  UNPAID:   "bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300",
  PAID:     "bg-green-100 text-green-800 dark:bg-green-500/10 dark:text-green-300",
  REFUNDED: "bg-gray-100 text-gray-700 dark:bg-gray-500/10 dark:text-gray-400",
};

const FILTER_OPTIONS = [
  { value: "PENDING",    label: "Pending"    },
  { value: "CONFIRMED",  label: "Confirmed"  },
  { value: "PROCESSING", label: "Processing" },
  { value: "SHIPPED",    label: "Shipped"    },
  { value: "DELIVERED",  label: "Delivered"  },
  { value: "CANCELLED",  label: "Cancelled"  },
];

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  // Cancel modal state
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  // ── Status update (PROCESSING / SHIPPED only) ─────────────────────────────
  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    const result = await updateOrderStatus(orderId, newStatus);

    if (result.success) {
      toast.success("Status updated", { description: result.message });

      if (newStatus === "SHIPPED") {
        try {
          await fetch("/api/supplier/orders/notify-shipped", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId }),
          });
          toast.info("Customer notified on Telegram 📱");
        } catch {
          // non-critical
        }
      }
      router.refresh();
    } else {
      toast.error("Failed to update", { description: result.error });
    }
    setUpdatingOrder(null);
  };

  // ── Cancel order ──────────────────────────────────────────────────────────
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      toast.error("Please provide a cancellation reason.");
      return;
    }
    setCancelling(true);
    const result = await supplierCancelOrder(cancelTarget.id, cancelReason.trim());
    if (result.success) {
      toast.success("Order cancelled", { description: result.message });
      setCancelTarget(null);
      setCancelReason("");
      router.refresh();
    } else {
      toast.error("Failed to cancel", { description: result.error });
    }
    setCancelling(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Orders</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your orders and deliveries
              </p>
            </div>
            <button
              onClick={() => router.push("/supplier/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-brand-orange text-white"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            All ({orders.length})
          </button>
          {FILTER_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === s.value
                  ? "bg-brand-orange text-white"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              {s.label} ({orders.filter((o) => o.status === s.value).length})
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No orders here</h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Orders will appear here when customers place them"
                : `No ${filter.toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const supplierType = order.items[0]?.product.supplier.supplierType ?? "LOCAL";
              const isActive = !["DELIVERED", "CANCELLED"].includes(order.status);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-card p-6 space-y-4"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-lg font-bold text-foreground">
                          #{order.orderNumber}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[order.status] ?? ""}`}>
                          {order.status}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${PAYMENT_BADGE[order.paymentStatus] ?? ""}`}>
                          {order.paymentStatus === "PAID" ? "✓ Paid" : order.paymentStatus === "REFUNDED" ? "↩ Refunded" : "Unpaid"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(order.createdAt).toLocaleDateString("en-NG", {
                          year: "numeric", month: "long", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-brand-orange shrink-0">
                      ₦{order.totalAmount.toLocaleString()}
                    </p>
                  </div>

                  {/* Timer */}
                  <OrderTimer
                    createdAt={order.createdAt}
                    supplierType={supplierType}
                    status={order.status}
                  />

                  {/* Customer Info */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Customer</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="font-medium text-foreground">{order.user.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground">{order.user.email}</p>
                      </div>
                      {order.user.phone && (
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="font-medium text-foreground">{order.user.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Delivery Address</p>
                        <p className="font-medium text-foreground">{order.deliveryAddress || "Not provided"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-foreground">Items</h4>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3"
                      >
                        {item.product.imageUrls[0] && (
                          <img
                            src={item.product.imageUrls[0]}
                            alt={item.product.name}
                            className="w-14 h-14 object-cover rounded-lg shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity}{item.size ? ` · Size: ${item.size}` : ""} · ₦{item.unitPrice.toLocaleString()} each
                          </p>
                        </div>
                        <p className="font-bold text-brand-orange shrink-0">
                          ₦{(item.quantity * item.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Actions — only shown for active orders */}
                  {isActive && (
                    <div className="pt-4 border-t border-border space-y-3">
                      {/* PROCESSING button — only from CONFIRMED */}
                      {order.status === "CONFIRMED" && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, "PROCESSING")}
                          disabled={updatingOrder === order.id}
                          className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                        >
                          {updatingOrder === order.id ? "Updating…" : "⚙️ Mark as Processing"}
                        </button>
                      )}

                      {/* SHIPPED button — from CONFIRMED or PROCESSING */}
                      {(order.status === "CONFIRMED" || order.status === "PROCESSING") && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, "SHIPPED")}
                          disabled={updatingOrder === order.id}
                          className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {updatingOrder === order.id ? "Updating…" : "🚚 Mark as Shipped — Notify Customer"}
                        </button>
                      )}

                      {/* CANCEL button — available on any non-terminal order */}
                      <button
                        onClick={() => { setCancelTarget(order); setCancelReason(""); }}
                        disabled={updatingOrder === order.id}
                        className="w-full py-2.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm transition-colors disabled:opacity-50"
                      >
                        ✕ Cancel Order{order.paymentStatus === "PAID" ? " & Refund" : ""}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Cancel Order Modal */}
      {cancelTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !cancelling && setCancelTarget(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  Cancel Order #{cancelTarget.orderNumber}?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {cancelTarget.paymentStatus === "PAID"
                    ? "This order has been paid. Cancelling will automatically initiate a full refund to the customer."
                    : "No payment has been made. The order will be cancelled and stock restored."}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reason for cancellation <span className="text-red-400">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Item out of stock, unable to fulfil order…"
                rows={3}
                disabled={cancelling}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This reason will be sent to the customer via Telegram.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCancelTarget(null)}
                disabled={cancelling}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Keep Order
              </button>
              <button
                onClick={handleCancelConfirm}
                disabled={cancelling || !cancelReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {cancelling
                  ? "Cancelling…"
                  : cancelTarget.paymentStatus === "PAID"
                  ? "Cancel & Refund"
                  : "Cancel Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
