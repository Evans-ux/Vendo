"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, RefreshCw } from "lucide-react";

const PRODUCT_CATEGORIES = [
  "Footwear", "Tops", "Bottoms", "Dresses",
  "Accessories", "Bags", "Jewelry", "Other",
];

const SIZE_PRESETS: Record<string, string[]> = {
  Footwear: ["38", "39", "40", "41", "42", "43", "44", "45"],
  Tops:     ["XS", "S", "M", "L", "XL", "XXL"],
  Bottoms:  ["XS", "S", "M", "L", "XL", "XXL"],
  Dresses:  ["XS", "S", "M", "L", "XL", "XXL"],
  Other:    [],
};

const productSchema = z.object({
  name:           z.string().min(3).max(120),
  category:       z.string().min(1, "Please select a category"),
  description:    z.string().max(500).optional(),
  basePrice:      z.string().min(1).refine((v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0, "Enter a valid price"),
  stock:          z.string().min(1).refine((v) => !isNaN(parseInt(v)) && parseInt(v) >= 1, "Stock must be at least 1"),
  deliveryMethod: z.enum(["SELF_DELIVERY", "PLATFORM_LOGISTICS"] as const),
});

type ProductFormData = z.infer<typeof productSchema>;

interface LogisticsRate {
  price: number;
  courierId: string | null;
  courierName: string;
  eta?: string;
  allRates?: Array<{ id: string; name: string; price: number; eta?: string }>;
  source: string;
}

export default function ProductStep3Client() {
  const router = useRouter();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  // Sendbox live rate state
  const [logisticsRate, setLogisticsRate] = useState<LogisticsRate | null>(null);
  const [fetchingRate, setFetchingRate] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", description: "", category: "",
      basePrice: "", stock: "", deliveryMethod: "SELF_DELIVERY",
    },
  });

  const category       = watch("category");
  const basePrice      = watch("basePrice");
  const deliveryMethod = watch("deliveryMethod");
  const sizeOptions    = SIZE_PRESETS[category] ?? [];

  // ── Fetch live Sendbox rate when Platform Logistics + category selected ──
  useEffect(() => {
    if (deliveryMethod !== "PLATFORM_LOGISTICS" || !category) {
      setLogisticsRate(null);
      return;
    }

    let cancelled = false;

    const fetchRate = async () => {
      setFetchingRate(true);
      try {
        const res = await fetch("/api/sendbox/cheapest-rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category }),
        });
        const data = await res.json();
        if (!cancelled) {
          if (res.ok) {
            setLogisticsRate(data);
          } else {
            toast.error(data.error || "Could not fetch logistics rate");
          }
        }
      } catch {
        if (!cancelled) toast.error("Network error fetching logistics rate");
      } finally {
        if (!cancelled) setFetchingRate(false);
      }
    };

    fetchRate();
    // Refresh every 2 minutes so the fee stays current
    const interval = setInterval(fetchRate, 120_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [deliveryMethod, category]);

  const logisticsFee = logisticsRate?.price ?? 0;

  // ── Image handlers ────────────────────────────────────────────────────────
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.warning("Maximum 5 images allowed.");
      return;
    }
    const valid = files.filter((f) => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image.`); return false; }
      if (f.size > 5 * 1024 * 1024) { toast.error(`${f.name} exceeds 5MB.`); return false; }
      return true;
    });
    setImages((p) => [...p, ...valid]);
    valid.forEach((f) => {
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviews((p) => [...p, reader.result as string]);
      reader.readAsDataURL(f);
    });
  };

  const removeImage = (i: number) => {
    setImages((p) => p.filter((_, idx) => idx !== i));
    setImagePreviews((p) => p.filter((_, idx) => idx !== i));
  };

  const toggleSize = (size: string) =>
    setSelectedSizes((p) => p.includes(size) ? p.filter((s) => s !== size) : [...p, size]);

  // ── Submit ────────────────────────────────────────────────────────────────
  const onSubmit = async (data: ProductFormData) => {
    if (images.length === 0) { setImageError("Please upload at least one product image."); return; }
    if (sizeOptions.length > 0 && selectedSizes.length === 0) {
      toast.error("Please select at least one available size.");
      return;
    }
    if (data.deliveryMethod === "PLATFORM_LOGISTICS" && !logisticsRate) {
      toast.error("Logistics rate not loaded yet. Please wait a moment.");
      return;
    }

    const toastId = toast.loading("Uploading images and creating your product...");
    try {
      const imgForm = new FormData();
      images.forEach((img) => imgForm.append("images", img));
      const uploadRes = await fetch("/api/supplier/products/upload-images", { method: "POST", body: imgForm });
      if (!uploadRes.ok) {
        toast.error((await uploadRes.json()).message || "Image upload failed.", { id: toastId });
        return;
      }
      const { imageUrls } = await uploadRes.json();

      const productRes = await fetch("/api/supplier/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          basePrice: parseFloat(data.basePrice),
          stock: parseInt(data.stock),
          sizes: { available: selectedSizes },
          imageUrls,
          logisticsFee: data.deliveryMethod === "PLATFORM_LOGISTICS" ? logisticsFee : null,
        }),
      });

      const result = await productRes.json();
      if (!productRes.ok) { toast.error(result.message || "Failed to create product.", { id: toastId }); return; }

      toast.success("Product created! One last step — please review our terms.", { id: toastId });
      router.push("/supplier/onboard/terms");
    } catch {
      toast.error("Network error. Please try again.", { id: toastId });
    }
  };

  const basePriceNum = parseFloat(basePrice) || 0;
  const sellingPrice = basePriceNum * 1.10;
  const payout = sellingPrice - (deliveryMethod === "PLATFORM_LOGISTICS" ? logisticsFee : 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

      {/* Product Name */}
      <div className="space-y-1">
        <Label htmlFor="name">Product Name <span className="text-brand-orange">*</span></Label>
        <Input id="name" placeholder="e.g. Black Leather Sneakers" className="focus-visible:ring-brand-orange" {...register("name")} />
        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div className="space-y-1">
          <Label htmlFor="category">Category <span className="text-brand-orange">*</span></Label>
          <select id="category" {...register("category")}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange">
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {errors.category && <p className="text-xs text-destructive mt-1">{errors.category.message}</p>}
        </div>

        {/* Stock */}
        <div className="space-y-1">
          <Label htmlFor="stock">Stock Quantity <span className="text-brand-orange">*</span></Label>
          <Input id="stock" type="number" placeholder="e.g. 50" className="focus-visible:ring-brand-orange" {...register("stock")} />
          {errors.stock && <p className="text-xs text-destructive mt-1">{errors.stock.message}</p>}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" placeholder="Material, fit, features..." rows={3} className="focus-visible:ring-brand-orange resize-none" {...register("description")} />
      </div>

      {/* Base Price */}
      <div className="space-y-1">
        <Label htmlFor="basePrice">Your Cost Price (₦) <span className="text-brand-orange">*</span></Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₦</span>
          <Input id="basePrice" type="number" step="0.01" placeholder="5000" className="pl-8 focus-visible:ring-brand-orange" {...register("basePrice")} />
        </div>
        {errors.basePrice && <p className="text-xs text-destructive mt-1">{errors.basePrice.message}</p>}
        {basePriceNum > 0 && (
          <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-brand-orange/20 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Selling price (10% markup):</span>
            <span className="font-bold text-brand-orange">₦{sellingPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        )}
      </div>

      {/* Delivery Method */}
      <div className="space-y-3 pt-2">
        <Label>Delivery Method <span className="text-brand-orange">*</span></Label>
        <p className="text-sm text-muted-foreground">Choose how this product will be delivered to customers.</p>

        <div className="space-y-3">
          {/* Self Delivery */}
          <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:border-brand-orange/50 transition-all">
            <input type="radio" value="SELF_DELIVERY" className="mt-1 text-brand-orange focus:ring-brand-orange" {...register("deliveryMethod")} />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Self-Delivery (Own Waybill)</p>
              <p className="text-sm text-muted-foreground mt-1">You handle delivery yourself · No logistics fee · Keep full profit</p>
            </div>
          </label>

          {/* Platform Logistics */}
          <label className="flex items-start gap-3 p-4 border rounded-xl cursor-pointer hover:border-brand-orange/50 transition-all">
            <input type="radio" value="PLATFORM_LOGISTICS" className="mt-1 text-brand-orange focus:ring-brand-orange" {...register("deliveryMethod")} />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Platform Logistics (Sendbox)</p>
              <p className="text-sm text-muted-foreground mt-1">Vendo handles delivery via Sendbox · Real-time pricing</p>

              {deliveryMethod === "PLATFORM_LOGISTICS" && (
                <div className="mt-3 space-y-2">
                  {fetchingRate ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Fetching live Sendbox rates...
                    </div>
                  ) : logisticsRate ? (
                    <div className="p-3 rounded-lg bg-brand-orange/5 border border-brand-orange/20 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">
                          {logisticsRate.courierName}
                          {logisticsRate.source === "sendbox_live" && (
                            <span className="ml-2 text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">LIVE</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-brand-orange text-lg">₦{logisticsFee.toLocaleString()}</span>
                          <button type="button" onClick={() => {
                            setLogisticsRate(null);
                            // Re-trigger by toggling — useEffect will re-run
                          }} className="text-muted-foreground hover:text-foreground">
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      {logisticsRate.eta && <p className="text-xs text-muted-foreground">ETA: {logisticsRate.eta}</p>}
                      {logisticsRate.source === "static_fallback" && (
                        <p className="text-xs text-yellow-600 dark:text-yellow-400">⚠️ Using estimated rate — live pricing unavailable</p>
                      )}
                      {basePriceNum > 0 && (
                        <div className="pt-2 border-t border-border mt-2 flex justify-between text-sm">
                          <span className="text-muted-foreground">Your payout per order:</span>
                          <span className="font-semibold text-foreground">₦{payout.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select a category above to see live logistics rates</p>
                  )}
                </div>
              )}
            </div>
          </label>
        </div>
        {errors.deliveryMethod && <p className="text-xs text-destructive mt-1">{errors.deliveryMethod.message}</p>}
      </div>

      {/* Sizes */}
      {sizeOptions.length > 0 && (
        <div className="space-y-3 pt-2">
          <Label>Available Sizes <span className="text-brand-orange">*</span></Label>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button key={size} type="button" onClick={() => toggleSize(size)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                  selectedSizes.includes(size) ? "bg-brand-orange text-white shadow-md scale-105" : "bg-muted/50 text-foreground hover:bg-muted border border-transparent"
                }`}>
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      <div className="space-y-2 pt-2">
        <Label>Product Images <span className="text-brand-orange">*</span></Label>
        <div className="border-2 border-dashed border-muted/50 rounded-lg p-6 hover:border-brand-orange transition-all">
          <input id="images" type="file" accept="image/*" multiple onChange={handleImageChange} className="hidden" />
          <label htmlFor="images" className="cursor-pointer flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center text-brand-orange">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-base font-medium text-foreground">Click to upload images (max 5)</span>
            <span className="text-sm text-muted-foreground">First image = thumbnail · Max 5MB each</span>
          </label>
          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              {imagePreviews.map((preview, i) => (
                <div key={i} className="relative group aspect-square">
                  <img src={preview} alt={`Preview ${i + 1}`} className="w-full h-full object-cover rounded-lg shadow-sm border border-muted/20" />
                  {i === 0 && <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[10px] text-center py-1 rounded">Main Image</div>}
                  <button type="button" onClick={() => removeImage(i)}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {imageError && <p className="text-xs text-destructive mt-1">{imageError}</p>}
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-6 border-t border-muted/20">
        <Button type="button" variant="outline" onClick={() => router.push("/supplier/onboard/kyc")} className="flex-1">Back</Button>
        <Button type="button" variant="outline" onClick={() => router.push("/supplier/onboard/terms")} className="flex-1">Skip for now</Button>
        <Button type="submit" disabled={isSubmitting} className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white">
          {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</> : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
}
