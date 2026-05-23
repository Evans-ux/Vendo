"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import OrderTimer from "@/components/supplier/OrderTimer";
import { updateOrderStatus } from "@/app/actions/supplier";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingAddress: string;
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

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending", color: "yellow" },
  { value: "CONFIRMED", label: "Confirmed", color: "blue" },
  { value: "PROCESSING", label: "Processing", color: "purple" },
  { value: "SHIPPED", label: "Shipped", color: "indigo" },
  { value: "DELIVERED", label: "Delivered", color: "green" },
  { value: "CANCELLED", label: "Cancelled", color: "red" },
];

export default function OrdersClient({ orders }: { orders: Order[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);

  const filteredOrders =
    filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrder(orderId);
    const result = await updateOrderStatus(orderId, newStatus);

    if (result.success) {
      toast.success("Order status updated", {
        description: result.message,
      });
      router.refresh();
    } else {
      toast.error("Failed to update order", {
        description: result.error,
      });
    }
    setUpdatingOrder(null);
  };

  const getStatusColor = (status: string) => {
    const option = STATUS_OPTIONS.find((s) => s.value === status);
    return option?.color || "gray";
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
            All Orders ({orders.length})
          </button>
          {STATUS_OPTIONS.map((status) => {
            const count = orders.filter((o) => o.status === status.value).length;
            return (
              <button
                key={status.value}
                onClick={() => setFilter(status.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === status.value
                    ? "bg-brand-orange text-white"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {status.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No orders yet</h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "Orders will appear here when customers place them"
                : `No ${filter.toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const supplierType = order.items[0]?.product.supplier.supplierType || "LOCAL";
              const statusColor = getStatusColor(order.status);

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-border bg-card p-6 space-y-4"
                >
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-foreground">
                          #{order.orderNumber}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold bg-${statusColor}-500/10 text-${statusColor}-400 border border-${statusColor}-500/30`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Placed on {new Date(order.createdAt).toLocaleDateString("en-NG", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-brand-orange">
                        ₦{order.totalAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.paymentStatus === "PAID" ? "✓ Paid" : "Pending Payment"}
                      </p>
                    </div>
                  </div>

                  {/* Timer */}
                  <OrderTimer
                    createdAt={order.createdAt}
                    supplierType={supplierType}
                    status={order.status}
                  />

                  {/* Customer Info */}
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <h4 className="text-sm font-semibold text-foreground mb-3">
                      Customer Information
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Name</p>
                        <p className="text-foreground font-medium">{order.user.name}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Email</p>
                        <p className="text-foreground font-medium">{order.user.email}</p>
                      </div>
                      {order.user.phone && (
                        <div>
                          <p className="text-muted-foreground">Phone</p>
                          <p className="text-foreground font-medium">{order.user.phone}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted-foreground">Shipping Address</p>
                        <p className="text-foreground font-medium">{order.shippingAddress}</p>
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-foreground">Order Items</h4>
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3"
                      >
                        {item.product.imageUrls[0] && (
                          <img
                            src={item.product.imageUrls[0]}
                            alt={item.product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{item.product.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantity: {item.quantity} × ₦{item.unitPrice.toLocaleString()}
                          </p>
                        </div>
                        <p className="font-bold text-brand-orange">
                          ₦{(item.quantity * item.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Status Update */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground w-full mb-2">Update Status:</p>
                    {STATUS_OPTIONS.filter((s) => s.value !== order.status).map((status) => (
                      <button
                        key={status.value}
                        onClick={() => handleStatusUpdate(order.id, status.value)}
                        disabled={updatingOrder === order.id}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-${status.color}-500/10 text-${status.color}-400 border border-${status.color}-500/30 hover:bg-${status.color}-500/20 disabled:opacity-50`}
                      >
                        {updatingOrder === order.id ? "Updating..." : `Mark as ${status.label}`}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
