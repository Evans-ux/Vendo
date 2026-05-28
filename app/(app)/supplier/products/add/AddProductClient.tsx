import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, X, Upload, ArrowLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";

interface ProductFormData {
  name: string;
  category: string;
  description: string;
  basePrice: string;
  stock: string;
  sizes: string;
  deliveryMethod: "SELF_DELIVERY" | "PLATFORM_LOGISTICS";
}

const CATEGORIES = [
  "Footwear",
  "Tops",
  "Bottoms",
  "Dresses",
  "Bags",
  "Jewelry",
  "Accessories",
  "Other",
];

const LOGISTICS_FEES: Record<string, number> = {
  Accessories: 800,
  Footwear: 1500,
  Tops: 1200,
  Bottoms: 1200,
  Dresses: 1200,
  Bags: 2000,
  Jewelry: 800,
  Other: 1500,
};

const CHEAPEST_LOGISTICS_FEE = Math.min(...Object.values(LOGISTICS_FEES));

export default function AddProductClient() {
  const router = useRouter();

  // ----- State -----------------------------------------------------------
  const [logisticsFee, setLogisticsFee] = useState<number>(0);
  const [courierId, setCourierId] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // **Moved above useEffect** – now available to the effect
  const [formData, setFormData] = useState<ProductFormData>({
    name: "",
    category: "",
    description: "",
    basePrice: "",
    stock: "",
    sizes: "",
    deliveryMethod: "SELF_DELIVERY",
  });

  // ----- Fetch cheapest Sendbox rate when Platform Logistics is selected ---
  useEffect(() => {
    if (formData.deliveryMethod !== "PLATFORM_LOGISTICS" || !formData.category) return;
    const fetchRate = async () => {
      try {
        const res = await fetch("/api/sendbox/cheapest-rate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: formData.category }),
        });
        const data = await res.json();
        if (res.ok) {
          setLogisticsFee(parseFloat(data.price));
          setCourierId(data.courierId ?? "");
        } else {
          toast.error(data.error ?? "Failed to fetch logistics rate");
        }
      } catch {
        toast.error("Network error while fetching logistics rate");
      }
    };
    fetchRate();
    const interval = setInterval(fetchRate, 120_000); // refresh every 2 min
    return () => clearInterval(interval);
  }, [formData.deliveryMethod, formData.category]);

  // ----- Cleanup object URLs ------------------------------------------------
  useEffect(() => () => {
    if (previews.length > 0) {
      previews.forEach(url => URL.revokeObjectURL(url));
    }
  }, [previews]);

  // ----- Derived values ----------------------------------------------------
  // logisticsFee is fetched from Sendbox API and stored in state `logisticsFee`.
  const sellingPrice = useMemo(() => {
    const base = parseFloat(formData.basePrice) || 0;
    return base * 1.1;
  }, [formData.basePrice]);

  // ----- Handlers ---------------------------------------------------------
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 5) {
      toast.error("You can only upload up to 5 images");
      return;
    }
    setImages(prev => [...prev, ...files]);
    setPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeImage = (idx: number) => {
    setImages(prev => prev.filter((_v, i) => i !== idx));
    setPreviews(prev => {
      URL.revokeObjectURL(prev[idx]);
      return prev.filter((_v, i) => i !== idx);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) return toast.error("Please upload at least one product image");
    if (isNaN(parseFloat(formData.basePrice)) || parseFloat(formData.basePrice) <= 0)
      return toast.error("Please enter a valid base price");

    setIsSubmitting(true);
    try {
      // 1️⃣ Upload images
      const imgForm = new FormData();
      images.forEach(img => imgForm.append("images", img));
      const uploadRes = await fetch("/api/supplier/products/upload-images", {
        method: "POST",
        body: imgForm,
      });
      if (!uploadRes.ok) throw new Error("Failed to upload images");
      const { imageUrls } = await uploadRes.json();

      // 2️⃣ Build payload
      const payload = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        stock: parseInt(formData.stock),
        sizes: { available: formData.sizes.split(",").map(s => s.trim()).filter(Boolean) },
        imageUrls,
        logisticsFee,
        courierId,
      };

      // 3️⃣ Create product
      const prodRes = await fetch("/api/supplier/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!prodRes.ok) throw new Error("Failed to create product");

      // Cleanup previews
      previews.forEach(u => URL.revokeObjectURL(u));
      setPreviews([]);
      setImages([]);

      toast.success("Product created successfully and sent for approval!");
      router.push("/supplier/products");
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ----- UI ---------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link href="/supplier/products" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Link>
      </div>
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Post New Product</CardTitle>
          <CardDescription>
            Listing a new item. All new products are reviewed by admin before going live.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Product Images */}
            <div className="space-y-4">
              <Label className="text-base">Product Images (1-5)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {previews.map((preview, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border-2 border-muted">
                    <Image src={preview} alt="Preview" fill className="object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 bg-red-500/90 text-white p-1.5 rounded-full hover:bg-red-600 transition-colors shadow-sm"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-muted-foreground/25 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground mt-2 font-medium">Add Photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            {/* Name & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Premium Suede Loafers"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="" disabled>Select a category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Pricing & Stock */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Price (Your Cost in ₦)</Label>
                <Input
                  id="basePrice"
                  type="number"
                  required
                  placeholder="0.00"
                  value={formData.basePrice}
                  onChange={e => setFormData({ ...formData, basePrice: e.target.value })}
                />
                <p className="text-[11px] text-muted-foreground font-medium">
                  Market Selling Price: ₦{sellingPrice.toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Quantity in Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  required
                  placeholder="0"
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: e.target.value })}
                />
              </div>
            </div>

            {/* Description & Sizes */}
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sizes">Available Sizes</Label>
                <Input
                  id="sizes"
                  required
                  placeholder="e.g. 40, 42, 44 or S, M, L"
                  value={formData.sizes}
                  onChange={e => setFormData({ ...formData, sizes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter detailed product information..."
                  className="min-h-[120px] resize-none"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            {/* Delivery Method */}
            <div className="space-y-4">
              <Label className="text-base">Logistics Choice</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryMethod: "SELF_DELIVERY" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    formData.deliveryMethod === "SELF_DELIVERY"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-muted"
                  }`}
                >
                  <p className="font-bold text-sm">Self-Delivery</p>
                  <p className="text-xs text-muted-foreground mt-1">You handle waybill. 0% logistics fee.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, deliveryMethod: "PLATFORM_LOGISTICS" })}
                  className={`p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${
                    formData.deliveryMethod === "PLATFORM_LOGISTICS"
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-muted"
                  }`}
                >
                  <p className="font-bold text-sm">Platform Logistics</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We handle shipping. Fee: ₦{logisticsFee.toLocaleString()}
                  </p>
                </button>
              </div>
            </div>

            {/* Earnings & Submit */}
            <div className="pt-6 border-t">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="w-full sm:w-auto p-4 rounded-xl bg-muted/50 border border-muted">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                    Your Earnings Per Sale
                  </p>
                  <p className="text-2xl font-black text-primary">
                    ₦
                    {(parseFloat(formData.basePrice) -
                      (formData.deliveryMethod === "PLATFORM_LOGISTICS" ? logisticsFee : 0) || 0).toLocaleString()}
                  </p>
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  size="lg"
                  className="w-full sm:w-auto px-12 h-14 text-base font-bold shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    "Post Product"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}