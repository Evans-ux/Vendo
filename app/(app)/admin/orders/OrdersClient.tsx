"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelOrder, refundOrder } from "@/app/actions/admin";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  deliveryAddress: string;
  createdAt: string;
  user: { name: string; email: string };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    product: {
      name: string;
      supplier: { businessName: string; supplierType: string };
    };
  }>;
}

const STATUS_OPTIONS = [
  { value: "PENDING",   label: "Pending"   },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "SHIPPED",   label: "Shipped"   },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, string> = {
  PENDING:    "bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300",
  CONFIRMED:  "bg-blue-100   dark:bg-blue-900/30   text-blue-800   dark:text-blue-300",
  PROCESSING: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
  SHIPPED:    "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300",
  DELIVERED:  "bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300",
  CANCELLED:  "bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300",
};

const PAYMENT_BADGE: Record<string, string> = {
  UNPAID:   "bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300",
  PAID:     "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
  REFUNDED: "bg-gray-100  dark:bg-gray-800/50   text-gray-600  dark:text-gray-400",
};

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [acting, setActing] = useState(false);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const statusBadge = (s: string) => STATUS_BADGE[s] ?? "bg-muted text-muted-foreground";
  const paymentBadge = (s: string) => PAYMENT_BADGE[s] ?? "bg-muted text-muted-foreground";

  // ── Cancel (UNPAID only) ──────────────────────────────────────────────────
  const handleCancel = async (order: Order) => {
    if (!confirm(`Cancel order #${order.orderNumber}? No refund will be issued (order is unpaid).`)) return;
    setActing(true);
    const result = await cancelOrder(order.id);
    if (result.success) {
      toast.success("Order cancelled", { description: result.message });
      setSelectedOrder(null);
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setActing(false);
  };

  // ── Refund & Cancel (PAID only) ───────────────────────────────────────────
  const handleRefund = async (order: Order) => {
    if (
      !confirm(
        `Refund & cancel order #${order.orderNumber}?\n\n` +
        `This will:\n` +
        `• Initiate a full refund of ₦${order.totalAmount.toLocaleString()} via Flutterwave\n` +
        `• Cancel the order and restore stock\n` +
        `• Notify the customer on Telegram\n\n` +
        `This cannot be undone.`
      )
    ) return;
    setActing(true);
    const result = await refundOrder(order.id);
    if (result.success) {
      toast.success("Refund initiated", { description: result.message });
      setSelectedOrder(null);
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setActing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Orders</h1>
              <p className="text-sm text-muted-foreground mt-1">Monitor and manage all platform orders</p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
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
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
            }`}
          >
            All Orders ({orders.length})
          </button>
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === s.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {s.label} ({orders.filter((o) => o.status === s.value).length})
            </button>
          ))}
        </div>

        {/* Table */}
        {filteredOrders.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {filter === "all" ? "Orders will appear here when customers place them" : `No ${filter.toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    {["Order", "Customer", "Supplier", "Amount", "Status", "Payment", "Date", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">#{order.orderNumber}</p>
                        <p className="text-xs text-muted-foreground">{order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">{order.user.name}</p>
                        <p className="text-xs text-muted-foreground">{order.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">{order.items[0]?.product.supplier.businessName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items[0]?.product.supplier.supplierType === "LOCAL" ? "Local" : "Dropship"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-foreground">₦{order.totalAmount.toLocaleString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${paymentBadge(order.paymentStatus)}`}>
                          {order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">
                          {new Date(order.createdAt).toLocaleDateString("en-NG", {
                            month: "short", day: "numeric", year: "numeric",
                          })}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !acting && setSelectedOrder(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Order #{selectedOrder.orderNumber}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(selectedOrder.createdAt).toLocaleDateString("en-NG", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-muted-foreground hover:text-foreground text-xl leading-none"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status row */}
              <div className="flex flex-wrap gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentBadge(selectedOrder.paymentStatus)}`}>
                  {selectedOrder.paymentStatus}
                </span>
              </div>

              {/* Customer */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Customer</h3>
                <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm border border-border">
                  <p><span className="text-muted-foreground">Name:</span> <span className="font-medium text-foreground ml-2">{selectedOrder.user.name}</span></p>
                  <p><span className="text-muted-foreground">Email:</span> <span className="font-medium text-foreground ml-2">{selectedOrder.user.email}</span></p>
                  <p><span className="text-muted-foreground">Address:</span> <span className="font-medium text-foreground ml-2">{selectedOrder.deliveryAddress}</span></p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="bg-muted/30 rounded-xl p-4 flex justify-between items-center border border-border">
                      <div>
                        <p className="font-medium text-foreground">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{item.quantity} × ₦{item.unitPrice.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Supplier: {item.product.supplier.businessName}</p>
                      </div>
                      <p className="font-semibold text-foreground">₦{(item.quantity * item.unitPrice).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-border">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">₦{selectedOrder.totalAmount.toLocaleString()}</span>
              </div>

              {/* ── Admin Actions ─────────────────────────────────────────── */}
              {selectedOrder.status !== "CANCELLED" && selectedOrder.status !== "DELIVERED" && (
                <div className="border-t border-border pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin Actions</p>

                  {/* UNPAID → Cancel only (no money involved) */}
                  {selectedOrder.paymentStatus !== "PAID" && (
                    <button
                      onClick={() => handleCancel(selectedOrder)}
                      disabled={acting}
                      className="w-full py-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-semibold text-sm transition-colors disabled:opacity-50"
                    >
                      {acting ? "Processing…" : "✕ Cancel Order"}
                    </button>
                  )}

                  {/* PAID → Refund & Cancel (triggers Flutterwave refund first) */}
                  {selectedOrder.paymentStatus === "PAID" && (
                    <div className="space-y-2">
                      <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-3 text-sm text-amber-800 dark:text-amber-300">
                        ⚠️ This order has been <strong>paid</strong>. Cancelling will automatically initiate a full refund of <strong>₦{selectedOrder.totalAmount.toLocaleString()}</strong> via Flutterwave and notify the customer.
                      </div>
                      <button
                        onClick={() => handleRefund(selectedOrder)}
                        disabled={acting}
                        className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors disabled:opacity-50"
                      >
                        {acting ? "Processing refund…" : "💸 Refund & Cancel Order"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
