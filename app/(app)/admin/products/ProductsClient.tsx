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
  supplier: {
    businessName: string;
  };
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
      toast.success("Product Approved", {
        description: result.message,
      });
      router.refresh();
    } else {
      toast.error("Failed to approve product", {
        description: result.error,
      });
    }
    setProcessing(null);
  };

  const handleReject = async (productId: string) => {
    if (!confirm("Are you sure you want to reject this product?")) return;

    setProcessing(productId);
    const result = await rejectProduct(productId);

    if (result.success) {
      toast.success("Product Rejected", {
        description: result.message,
      });
      router.refresh();
    } else {
      toast.error("Failed to reject product", {
        description: result.error,
      });
    }
    setProcessing(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Products</h1>
              <p className="text-sm text-gray-500 mt-1">Review and manage product listings</p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors"
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
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "pending"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Pending ({products.filter((p) => !p.isApproved).length})
          </button>
          <button
            onClick={() => setFilter("approved")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "approved"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Approved ({products.filter((p) => p.isApproved).length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All ({products.length})
          </button>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {filter === "pending"
                ? "No products awaiting approval"
                : "Try adjusting your filters"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Product Image */}
                {product.imageUrls[0] ? (
                  <img
                    src={product.imageUrls[0]}
                    alt={product.name}
                    className="w-full h-48 object-cover cursor-pointer"
                    onClick={() => setSelectedProduct(product)}
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <span className="text-4xl">📦</span>
                  </div>
                )}

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.supplier.businessName}</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">Selling Price</p>
                      <p className="font-bold text-gray-900">
                        ₦{product.sellingPrice.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Stock</p>
                      <p className="font-medium text-gray-900">{product.stock}</p>
                    </div>
                  </div>

                  {product.category && (
                    <p className="text-xs text-gray-500">Category: {product.category}</p>
                  )}

                  {/* Status Badge */}
                  <div>
                    <span
                      className={`inline-block px-2 py-1 rounded-full text-xs font-semibold ${
                        product.isApproved
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {product.isApproved ? "Approved" : "Pending"}
                    </span>
                  </div>

                  {/* Actions */}
                  {!product.isApproved && (
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
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
                    className="w-full px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedProduct.name}</h2>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Images */}
              {selectedProduct.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {selectedProduct.imageUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`${selectedProduct.name} ${idx + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ))}
                </div>
              )}

              {/* Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
                  <p className="text-gray-900">
                    {selectedProduct.description || "No description provided"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Base Price</h3>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{selectedProduct.basePrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Selling Price</h3>
                    <p className="text-lg font-bold text-gray-900">
                      ₦{selectedProduct.sellingPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Stock</h3>
                    <p className="text-lg font-bold text-gray-900">{selectedProduct.stock}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Category</h3>
                    <p className="text-lg font-bold text-gray-900">
                      {selectedProduct.category || "N/A"}
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Supplier</h3>
                  <p className="text-gray-900">{selectedProduct.supplier.businessName}</p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Status</h3>
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedProduct.isApproved
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {selectedProduct.isApproved ? "Approved" : "Pending Approval"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {!selectedProduct.isApproved && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleApprove(selectedProduct.id)}
                    disabled={processing === selectedProduct.id}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processing === selectedProduct.id ? "Processing..." : "✓ Approve Product"}
                  </button>
                  <button
                    onClick={() => handleReject(selectedProduct.id)}
                    disabled={processing === selectedProduct.id}
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
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
