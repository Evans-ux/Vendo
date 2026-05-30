"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { approveProduct, rejectProduct } from "@/app/actions/admin";

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
  createdAt: string;
  supplier: { businessName: string };
}

export default function ProductsClient({ products }: { products: Product[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("pending");
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const filteredProducts = products.filter((p) => {
    if (filter === "all") return true;
    if (filter === "pending") return !p.isApproved;
    if (filter === "approved") return p.isApproved;
    return true;
  });

  const handleApprove = async (productId: string) => {
    setProcessing(productId);
    const result = await approveProduct(productId);
    if (result.success) {
      toast.success("Product Approved", { description: result.message });
      router.refresh();
    } else {
      toast.error("Failed to approve product", { description: result.error });
    }
    setProcessing(null);
  };

  const handleReject = async (productId: string) => {
    if (!confirm("Are you sure you want to reject this product?")) return;
    setProcessing(productId);
    const result = await rejectProduct(productId);
    if (result.success) {
      toast.success("Product Rejected", { description: result.message });
      router.refresh();
    } else {
      toast.error("Failed to reject product", { description: result.error });
    }
    setProcessing(null);
  };

  const FILTERS = [
    { key: "pending",  label: `Pending (${products.filter((p) => !p.isApproved).length})` },
    { key: "approved", label: `Approved (${products.filter((p) => p.isApproved).length})` },
    { key: "all",      label: `All (${products.length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Products</h1>
              <p className="text-sm text-muted-foreground mt-1">Review and manage product listings</p>
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
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No products found</h3>
            <p className="text-muted-foreground">
              {filter === "pending" ? "No products awaiting approval" : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-shadow"
              >
                {product.imageUrls[0] ? (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  />
                ) : (
                  <div className="w-full h-48 bg-muted flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.supplier.businessName}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Selling Price</p>
                      <p className="font-bold text-foreground">₦{product.sellingPrice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock</p>
                      <p className="font-medium text-foreground">{product.stock}</p>
                    </div>
                  </div>

                  {product.category && (
                    <p className="text-xs text-muted-foreground">Category: {product.category}</p>
                  )}

                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                    product.isApproved
                      ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                      : "bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300"
                  }`}>
                    {product.isApproved ? "Approved" : "Pending"}
                  </span>

                  {!product.isApproved && (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => handleApprove(product.id)}
                        disabled={processing === product.id}
                        className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processing === product.id ? "..." : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => handleReject(product.id)}
                        disabled={processing === product.id}
                        className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {processing === product.id ? "..." : "✗ Reject"}
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="w-full px-3 py-2 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Product Details Modal */}
      {selectedProduct && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-card rounded-2xl border border-border card-shadow-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>

            <div className="p-6 space-y-6">
              {selectedProduct.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedProduct.imageUrls.map((url, idx) => (
                    <img key={idx} src={url} alt={`${selectedProduct.name} ${idx + 1}`} className="w-full h-48 object-cover rounded-xl" />
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-foreground text-sm">{selectedProduct.description || "No description provided"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    ["Base Price", `₦${selectedProduct.basePrice.toLocaleString()}`],
                    ["Selling Price", `₦${selectedProduct.sellingPrice.toLocaleString()}`],
                    ["Stock", String(selectedProduct.stock)],
                    ["Category", selectedProduct.category || "N/A"],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-surface rounded-xl p-3 border border-border">
                      <p className="text-xs text-muted mb-1">{label}</p>
                      <p className="font-bold text-foreground">{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Supplier</p>
                  <p className="text-foreground font-medium">{selectedProduct.supplier.businessName}</p>
                </div>

                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                  selectedProduct.isApproved
                    ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300"
                }`}>
                  {selectedProduct.isApproved ? "Approved" : "Pending Approval"}
                </span>
              </div>

              {!selectedProduct.isApproved && (
                <div className="flex gap-3 pt-4 border-t border-border">
                  <button
                    onClick={() => handleApprove(selectedProduct.id)}
                    disabled={processing === selectedProduct.id}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processing === selectedProduct.id ? "Processing..." : "✓ Approve Product"}
                  </button>
                  <button
                    onClick={() => handleReject(selectedProduct.id)}
                    disabled={processing === selectedProduct.id}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    {processing === selectedProduct.id ? "Processing..." : "✗ Reject Product"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
