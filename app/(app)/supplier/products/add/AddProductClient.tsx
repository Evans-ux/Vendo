"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X, Upload, ArrowLeft, RefreshCw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

const CATEGORIES = [
  "Footwear", "Tops", "Bottoms", "Dresses",
  "Bags", "Jewelry", "Accessories", "Other",
];

interface LogisticsRate {
  price: number;
  courierId: string | null;
  courierName: string;
  eta?: string;
  source: "sendbox_live" | "static_fallback";
  note?: string;
}

interface PickupInfo {
  address: string;
  city: string;
  state: string;
  postCode: string;
  phone: string;
}

export default function AddProductClient({
  supplierPickup,
}: {
  supplierPickup?: Partial<PickupInfo>;
}) {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    category: "",
    description: "",
    basePrice: "",
    stock: "",
    sizes: "",
    deliveryMethod: "SELF_DELIVERY" as "SELF_DELIVERY" | "PLATFORM_LOGISTICS",
  });

  // Pickup address — pre-filled from supplier profile if available
  const [pickup, setPickup] = useState<PickupInfo>({
    address:  supplierPickup?.address  ?? "",
    city:     supplierPickup?.city     ?? "",
    state:    supplierPickup?.state    ?? "",
    postCode: supplierPickup?.postCode ?? "",
    phone:    supplierPickup?.phone    ?? "",
  });

  const [logisticsRate, setLogisticsRate] = useState<LogisticsRate | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [courierId, setCourierId] = useState("");

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Fetch live Sendbox rate ───────────────────────────────────────────────
  const fetchRate = async () => {
    if (form.deliveryMethod !== "PLATFORM_LOGISTICS" || !form.category) return;
    setFetchingRate(true);
    try {
      const res = await fetch("/api/sendbox/cheapest-rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: form.category,
          pickupAddress: pickup.address || undefined,
          pickupCity:    pickup.city    || undefined,
          pickupState:   pickup.state   || undefined,
          pickupPostCode: pickup.postCode || undefined,
          pickupPhone:   pickup.phone   || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setLogisticsRate(data);
        setCourierId(data.courierId ?? "");
        if (data.source === "static_fallback") {
          toast.warning("Using estimated rate — " + (data.note ?? "Sendbox live rates unavailable"));
        }
      } else {
        toast.error(data.error ?? "Failed to fetch logistics rate");
      }
    } catch {
      toast.error("Network error fetching logistics rate");
    } finally {
      setFetchingRate(false);
    }
  };

  useEffect(() => {
    if (form.deliveryMethod !== "PLATFORM_LOGISTICS" || !form.category) {
      setLogisticsRate(null);
      return;
    }
    fetchRate();
    const interval = setInterval(fetchRate, 120_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.deliveryMethod, form.category]);

  // Cleanup object URLs on unmount
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const sellingPrice = useMemo(
    () => Math.round((parseFloat(form.basePrice) || 0) * 1.1 * 100) / 100,
    [form.basePrice]
  );

  const logisticsFee = logisticsRate?.price ?? 0;
  const payout = (parseFloat(form.basePrice) || 0) -
    (form.deliveryMethod === "PLATFORM_LOGISTICS" ? logisticsFee : 0);

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    setImages((p) => [...p, ...files]);
    setPreviews((p) => [...p, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const removeImage = (idx: number) => {
    setImages((p) => p.filter((_, i) => i !== idx));
    setPreviews((p) => {
      URL.revokeObjectURL(p[idx]);
      return p.filter((_, i) => i !== idx);
    });
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return toast.error("Please upload at least one product image");
    if (!form.basePrice || parseFloat(form.basePrice) <= 0)
      return toast.error("Please enter a valid base price");
    if (form.deliveryMethod === "PLATFORM_LOGISTICS" && !logisticsRate) {
      return toast.error("Logistics rate not loaded yet — please wait a moment");
    }

    setIsSubmitting(true);
    try {
      // 1. Upload images
      const imgForm = new FormData();
      images.forEach((img) => imgForm.append("images", img));
      const uploadRes = await fetch("/api/supplier/products/upload-images", {
        method: "POST",
        body: imgForm,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload images");
      const { imageUrls } = await uploadRes.json();

      // 2. Create product
      const payload = {
        name: form.name,
        category: form.category,
        description: form.description || undefined,
        basePrice: parseFloat(form.basePrice),
        stock: parseInt(form.stock),
        sizes: { available: form.sizes.split(",").map((s) => s.trim()).filter(Boolean) },
        imageUrls,
        deliveryMethod: form.deliveryMethod,
        logisticsFee: form.deliveryMethod === "PLATFORM_LOGISTICS" ? logisticsFee : null,
        courierId: courierId || null,
      };

      const prodRes = await fetch("/api/supplier/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!prodRes.ok) {
        const err = await prodRes.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create product");
      }

      previews.forEach((u) => URL.revokeObjectURL(u));
      setPreviews([]);
      setImages([]);

      toast.success("Product created and sent for approval!");
      router.push("/supplier/products");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/supplier/products"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Products
        </Link>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 sm:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Post New Product</h1>
          <p className="text-sm text-muted-foreground mt-1">
            All new products are reviewed by admin before going live.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Images */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Product Images <span className="text-red-400">*</span>
              <span className="font-normal text-muted-foreground ml-1">(up to 5, first = thumbnail)</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {previews.map((preview, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-muted">
                  <Image src={preview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1.5 right-1.5 bg-red-500/90 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {i === 0 && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                      Main
                    </div>
                  )}
                </div>
              ))}
              {previews.length < 5 && (
                <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground mt-1.5">Add Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Name + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Product Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Premium Suede Loafers"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="" disabled>Select a category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Price + Stock */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Base Price — Your Cost (₦) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
                placeholder="0.00"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {parseFloat(form.basePrice) > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selling price (10% markup): <span className="font-semibold text-foreground">₦{sellingPrice.toLocaleString()}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Stock Quantity <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Available Sizes <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={form.sizes}
              onChange={(e) => setForm({ ...form, sizes: e.target.value })}
              placeholder="e.g. 40, 42, 44 or S, M, L, XL"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Material, fit, features, care instructions…"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {/* Delivery Method */}
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Delivery Method <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Self Delivery */}
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMethod: "SELF_DELIVERY" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.deliveryMethod === "SELF_DELIVERY"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-sm text-foreground">🚗 Self-Delivery</p>
                <p className="text-xs text-muted-foreground mt-1">
                  You handle your own waybill. No logistics fee deducted.
                </p>
              </button>

              {/* Platform Logistics */}
              <button
                type="button"
                onClick={() => setForm({ ...form, deliveryMethod: "PLATFORM_LOGISTICS" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  form.deliveryMethod === "PLATFORM_LOGISTICS"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <p className="font-semibold text-sm text-foreground">📦 Platform Logistics (Sendbox)</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vendo arranges pickup and delivery via Sendbox.
                  {logisticsRate && (
                    <span className="font-semibold text-foreground ml-1">
                      Fee: ₦{logisticsFee.toLocaleString()}
                    </span>
                  )}
                </p>
              </button>
            </div>

            {/* Platform Logistics expanded section */}
            {form.deliveryMethod === "PLATFORM_LOGISTICS" && (
              <div className="mt-4 rounded-xl border border-border bg-muted/20 p-5 space-y-5">
                {/* Rate display */}
                <div>
                  {fetchingRate ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching live Sendbox rate…
                    </div>
                  ) : logisticsRate ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                          {logisticsRate.courierName}
                          {logisticsRate.source === "sendbox_live" ? (
                            <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-bold">
                              LIVE
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full font-bold">
                              ESTIMATE
                            </span>
                          )}
                        </p>
                        {logisticsRate.eta && (
                          <p className="text-xs text-muted-foreground mt-0.5">ETA: {logisticsRate.eta}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">₦{logisticsFee.toLocaleString()}</span>
                        <button
                          type="button"
                          onClick={fetchRate}
                          disabled={fetchingRate}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="Refresh rate"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {form.category ? "Loading rate…" : "Select a category above to see the logistics fee."}
                    </p>
                  )}
                </div>

                {/* Pickup address fields */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-3">
                    Pickup Address
                    <span className="font-normal text-muted-foreground ml-1">
                      — where Sendbox will collect this product
                    </span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Street Address <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required={form.deliveryMethod === "PLATFORM_LOGISTICS"}
                        value={pickup.address}
                        onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
                        placeholder="e.g. 12 Onitsha Main Market Road"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        City <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required={form.deliveryMethod === "PLATFORM_LOGISTICS"}
                        value={pickup.city}
                        onChange={(e) => setPickup({ ...pickup, city: e.target.value })}
                        placeholder="e.g. Onitsha"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        State <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        required={form.deliveryMethod === "PLATFORM_LOGISTICS"}
                        value={pickup.state}
                        onChange={(e) => setPickup({ ...pickup, state: e.target.value })}
                        placeholder="e.g. Anambra"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Postal Code
                      </label>
                      <input
                        type="text"
                        value={pickup.postCode}
                        onChange={(e) => setPickup({ ...pickup, postCode: e.target.value })}
                        placeholder="e.g. 434101"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Pickup Phone <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="tel"
                        required={form.deliveryMethod === "PLATFORM_LOGISTICS"}
                        value={pickup.phone}
                        onChange={(e) => setPickup({ ...pickup, phone: e.target.value })}
                        placeholder="e.g. 08012345678"
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Filling in your exact address helps get a more accurate shipping rate.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Payout summary + Submit */}
          <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="w-full sm:w-auto p-4 rounded-xl bg-muted/40 border border-border">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                Your Payout Per Sale
              </p>
              <p className="text-2xl font-black text-primary">
                ₦{Math.max(0, payout).toLocaleString()}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                = base price{form.deliveryMethod === "PLATFORM_LOGISTICS" ? " − logistics fee" : ""}
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-10 py-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-bold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Posting…
                </>
              ) : (
                "Post Product"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
