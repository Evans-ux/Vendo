"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { updateProduct } from "@/app/actions/supplier";

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  basePrice: number;
  sellingPrice: number;
  stock: number;
  sizes: string;
  imageUrls: string[];
  deliveryMethod: "SELF_DELIVERY" | "PLATFORM_LOGISTICS" | "DROPSHIP_HANDLED";
  logisticsFee: number | null;
  isApproved: boolean;
}

const CATEGORIES = [
  "Footwear", "Tops", "Bottoms", "Dresses",
  "Bags", "Jewelry", "Accessories", "Other",
];

export default function EditProductClient({
  product,
  hasOrders,
}: {
  product: Product;
  hasOrders: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: product.name,
    description: product.description,
    category: product.category,
    basePrice: String(product.basePrice),
    stock: String(product.stock),
    sizes: product.sizes,
    deliveryMethod: product.deliveryMethod,
    logisticsFee: product.logisticsFee ?? 0,
  });

  // Refresh logistics fee from Sendbox when delivery method or category changes
  useEffect(() => {
    if (form.deliveryMethod !== "PLATFORM_LOGISTICS" || !form.category) return;
    fetch("/api/sendbox/cheapest-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category: form.category }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.price) setForm((f) => ({ ...f, logisticsFee: parseFloat(d.price) })); })
      .catch(() => {});
  }, [form.deliveryMethod, form.category]);

  const sellingPrice = useMemo(
    () => Math.round(parseFloat(form.basePrice || "0") * 1.1 * 100) / 100,
    [form.basePrice]
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hasOrders) return; // double-guard — server also blocks this

    setSaving(true);
    const result = await updateProduct(product.id, {
      name: form.name,
      description: form.description || undefined,
      category: form.category || undefined,
      basePrice: parseFloat(form.basePrice),
      stock: parseInt(form.stock),
      sizes: { available: form.sizes.split(",").map((s) => s.trim()).filter(Boolean) },
      deliveryMethod: form.deliveryMethod,
      logisticsFee: form.deliveryMethod === "PLATFORM_LOGISTICS" ? form.logisticsFee : null,
    });

    if (result.success) {
      toast.success("Product updated");
      router.push("/supplier/products");
      router.refresh();
    } else {
      toast.error("Failed to update", { description: result.error });
    }
    setSaving(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back */}
      <Link
        href="/supplier/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Products
      </Link>

      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Edit Product</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {product.isApproved ? "Live on store" : "Pending approval"}
          </p>
        </div>

        {/* Locked banner */}
        {hasOrders && (
          <div className="mb-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 p-4 flex gap-3">
            <span className="text-xl shrink-0">🔒</span>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm">
                Editing locked — this product has been ordered
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                Once a customer has placed an order for a product, its details are frozen to protect order integrity.
                You can still update the stock quantity.
              </p>
            </div>
          </div>
        )}

        {/* Product images (read-only) */}
        {product.imageUrls.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Product Images
            </p>
            <div className="flex gap-3 flex-wrap">
              {product.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Product image ${i + 1}`}
                  className="w-20 h-20 object-cover rounded-xl border border-border"
                />
              ))}
            </div>
            {!hasOrders && (
              <p className="text-xs text-muted-foreground mt-2">
                Image editing is not supported here. To change images, delete this product and re-create it.
              </p>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Product Name
            </label>
            <input
              type="text"
              required
              disabled={hasOrders}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              disabled={hasOrders}
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="">Select category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              disabled={hasOrders}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Base Price (₦)
              </label>
              <input
                type="number"
                required
                min={1}
                disabled={hasOrders}
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Selling price: ₦{sellingPrice.toLocaleString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Stock Quantity
              </label>
              {/* Stock is always editable — even after orders */}
              <input
                type="number"
                required
                min={0}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Available Sizes (comma-separated)
            </label>
            <input
              type="text"
              disabled={hasOrders}
              value={form.sizes}
              onChange={(e) => setForm({ ...form, sizes: e.target.value })}
              placeholder="e.g. 40, 42, 44 or S, M, L, XL"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </div>

          {/* Delivery Method */}
          {!hasOrders && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-3">
                Delivery Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(["SELF_DELIVERY", "PLATFORM_LOGISTICS"] as const).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setForm({ ...form, deliveryMethod: method })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.deliveryMethod === method
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">
                      {method === "SELF_DELIVERY" ? "Self-Delivery" : "Platform Logistics"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {method === "SELF_DELIVERY"
                        ? "You handle waybill. No logistics fee."
                        : `We handle shipping. Fee: ₦${form.logisticsFee.toLocaleString()}`}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push("/supplier/products")}
              className="flex-1 py-3 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
