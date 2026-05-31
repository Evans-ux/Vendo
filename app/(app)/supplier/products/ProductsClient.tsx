"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteProduct, requestProductDelete } from "@/app/actions/supplier";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  basePrice: number;
  sellingPrice: number;
  imageUrls: string[];
  stock: number;
  isApproved: boolean;
  isActive: boolean;
  deliveryMethod: "SELF_DELIVERY" | "PLATFORM_LOGISTICS" | "DROPSHIP_HANDLED";
  logisticsFee: number | null;
  createdAt: string;
  hasOrders: boolean; // true if any OrderItem references this product
  hasPendingDeleteRequest: boolean; // true if a PENDING delete request exists
}

export default function ProductsClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");

  // Hard-delete modal (no orders)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Delete-request modal (has orders)
  const [deleteRequestTarget, setDeleteRequestTarget] = useState<Product | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [requestingDelete, setRequestingDelete] = useState(false);

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "approved") return p.isApproved;
    if (filter === "pending") return !p.isApproved;
    return true;
  });

  // ── Hard delete (no order history) ───────────────────────────────────────
  const handleDelete = async (productId: string) => {
    setDeleting(true);
    const result = await deleteProduct(productId);
    if (result.success) {
      toast.success("Product deleted", { description: result.message });
      setDeleteConfirm(null);
      router.refresh();
    } else {
      toast.error("Failed to delete", { description: result.error });
    }
    setDeleting(false);
  };

  // ── Delete request (has order history) ───────────────────────────────────
  const handleDeleteRequest = async () => {
    if (!deleteRequestTarget) return;
    if (!deleteReason.trim()) {
      toast.error("Please provide a reason for the deletion request.");
      return;
    }
    setRequestingDelete(true);
    const result = await requestProductDelete(deleteRequestTarget.id, deleteReason.trim());
    if (result.success) {
      toast.success("Request submitted", { description: result.message });
      setDeleteRequestTarget(null);
      setDeleteReason("");
      router.refresh();
    } else {
      toast.error("Failed", { description: result.error });
    }
    setRequestingDelete(false);
  };

  const deliveryLabel = (p: Product) => {
    switch (p.deliveryMethod) {
      case "SELF_DELIVERY":
        return { text: "Self-Delivery", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300" };
      case "PLATFORM_LOGISTICS":
        return {
          text: `Platform Logistics (₦${p.logisticsFee?.toLocaleString()})`,
          color: "bg-green-500/10 text-green-700 dark:text-green-300",
        };
      case "DROPSHIP_HANDLED":
        return { text: "Dropship", color: "bg-purple-500/10 text-purple-700 dark:text-purple-300" };
      default:
        return { text: "Unknown", color: "bg-gray-500/10 text-gray-700 dark:text-gray-300" };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">My Products</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage your product listings</p>
            </div>
            <button
              onClick={() => router.push("/supplier/dashboard")}
              className="px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors whitespace-nowrap"
            >
              ← Back
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: `All (${products.length})` },
              { key: "approved", label: `Live (${products.filter((p) => p.isApproved).length})` },
              { key: "pending", label: `Pending (${products.filter((p) => !p.isApproved).length})` },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => router.push("/supplier/products/add")}
            className="w-full sm:w-auto px-4 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          >
            + Add Product
          </button>
        </div>

        {/* Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📦</div>
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">No products yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6">
              {filter === "all" ? "Start by adding your first product" : `No ${filter} products`}
            </p>
            <button
              onClick={() => router.push("/supplier/products/add")}
              className="px-4 sm:px-6 py-2.5 sm:py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-sm sm:text-base font-semibold transition-colors"
            >
              Add Your First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => {
              const dl = deliveryLabel(product);
              return (
                <div
                  key={product.id}
                  className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Image */}
                  {product.imageUrls[0] ? (
                    <div className="relative aspect-square">
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            product.isApproved ? "bg-green-500/90 text-white" : "bg-yellow-500/90 text-white"
                          }`}
                        >
                          {product.isApproved ? "Live" : "Pending"}
                        </span>
                        {product.hasOrders && (
                          <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-500/90 text-white">
                            Ordered
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square bg-muted flex items-center justify-center">
                      <span className="text-4xl sm:text-5xl">📦</span>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm sm:text-base line-clamp-2">
                        {product.name}
                      </h3>
                      {product.category && (
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">{product.category}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">Selling Price</p>
                        <p className="font-bold text-primary text-base sm:text-lg">
                          ₦{product.sellingPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Stock</p>
                        <p className="font-medium text-foreground text-sm sm:text-base">{product.stock}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Delivery:</span>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${dl.color}`}>
                          {dl.text}
                        </span>
                      </div>
                    </div>

                    {/* Pending delete request badge */}
                    {product.hasPendingDeleteRequest && (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                        ⏳ Delete request pending admin review
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      {/* Edit — always available, but page shows locked state if ordered */}
                      <button
                        onClick={() => router.push(`/supplier/products/${product.id}/edit`)}
                        className="flex-1 px-3 py-2 bg-muted/50 hover:bg-muted text-foreground text-xs sm:text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        {product.hasOrders ? "🔒 Edit" : "Edit"}
                      </button>

                      {/* Delete */}
                      {product.hasPendingDeleteRequest ? (
                        <button
                          disabled
                          className="flex-1 px-3 py-2 bg-muted/30 text-muted-foreground text-xs sm:text-sm font-medium rounded-lg cursor-not-allowed"
                        >
                          Pending…
                        </button>
                      ) : product.hasOrders ? (
                        <button
                          onClick={() => { setDeleteRequestTarget(product); setDeleteReason(""); }}
                          className="flex-1 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs sm:text-sm font-medium rounded-lg transition-colors"
                        >
                          Request Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(product.id)}
                          className="flex-1 px-3 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs sm:text-sm font-medium rounded-lg transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Hard Delete Modal */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !deleting && setDeleteConfirm(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🗑️</span>
            </div>
            <h3 className="text-lg font-bold text-foreground text-center mb-2">Delete Product?</h3>
            <p className="text-sm text-muted-foreground text-center mb-6">
              This product has no orders and will be permanently deleted. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Request Modal (product has orders) */}
      {deleteRequestTarget && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => !requestingDelete && setDeleteRequestTarget(null)}
        >
          <div
            className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                <span className="text-2xl">📋</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Request Product Removal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{deleteRequestTarget.name}</strong> has been ordered before, so it can't be deleted directly.
                  Your request will be sent to admin for review.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Reason for removal <span className="text-red-400">*</span>
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                placeholder="e.g. Product discontinued, no longer available from supplier…"
                rows={3}
                disabled={requestingDelete}
                className="w-full px-4 py-3 rounded-xl border border-border bg-muted/30 text-foreground placeholder:text-muted-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteRequestTarget(null)}
                disabled={requestingDelete}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRequest}
                disabled={requestingDelete || !deleteReason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {requestingDelete ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
