"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

const PRODUCT_CATEGORIES = [
  "Footwear", "Tops", "Bottoms", "Dresses",
  "Accessories", "Bags", "Jewelry", "Other",
];

const SIZE_PRESETS: Record<string, string[]> = {
  Footwear: ["38", "39", "40", "41", "42", "43", "44", "45"],
  Tops: ["XS", "S", "M", "L", "XL", "XXL"],
  Bottoms: ["XS", "S", "M", "L", "XL", "XXL"],
  Dresses: ["XS", "S", "M", "L", "XL", "XXL"],
  Other: [],
};

const productSchema = z.object({
  name: z
    .string()
    .min(3, "Product name must be at least 3 characters")
    .max(120, "Product name is too long"),
  category: z.string().min(1, "Please select a category"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional(),
  basePrice: z
    .string()
    .min(1, "Price is required")
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      "Enter a valid price greater than zero"
    ),
  stock: z
    .string()
    .min(1, "Stock quantity is required")
    .refine(
      (v) => !isNaN(parseInt(v)) && parseInt(v) >= 1,
      "Stock must be at least 1"
    ),
  deliveryMethod: z.enum(["SELF_DELIVERY", "PLATFORM_LOGISTICS"], {
    errorMap: () => ({ message: "Please select a delivery method" }),
  }),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductStep3Client() {
  const router = useRouter();
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      category: "",
      basePrice: "",
      stock: "",
      deliveryMethod: "SELF_DELIVERY",
    },
  });

  const category = watch("category");
  const basePrice = watch("basePrice");
  const deliveryMethod = watch("deliveryMethod");
  const sizeOptions = SIZE_PRESETS[category] ?? [];

  // Calculate logistics fee based on category
  const calculateLogisticsFee = (): number => {
    const fees: Record<string, number> = {
      'Accessories': 800,
      'Footwear': 1500,
      'Clothing': 1200,
      'Tops': 1200,
      'Bottoms': 1200,
      'Dresses': 1200,
      'Bags': 2000,
      'Jewelry': 800,
      'Other': 1500,
    };
    return fees[category] || 1500; // Default ₦1,500
  };

  const logisticsFee = calculateLogisticsFee();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError(null);
    const files = Array.from(e.target.files || []);

    if (images.length + files.length > 5) {
      toast.warning("You can upload a maximum of 5 product images.");
      return;
    }

    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not a valid image file.`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds the 5MB size limit.`);
        return false;
      }
      return true;
    });

    setImages((prev) => [...prev, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        setImagePreviews((prev) => [...prev, reader.result as string]);
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const onSubmit = async (data: ProductFormData) => {
    // Extra client-side guards not covered by Zod
    if (images.length === 0) {
      setImageError("Please upload at least one product image.");
      return;
    }
    if (sizeOptions.length > 0 && selectedSizes.length === 0) {
      toast.error("Please select at least one available size for this category.");
      return;
    }

    const toastId = toast.loading("Uploading images and creating your product...");

    try {
      // Upload images
      const imageFormData = new FormData();
      images.forEach((img) => imageFormData.append("images", img));

      const uploadRes = await fetch("/api/supplier/products/upload-images", {
        method: "POST",
        body: imageFormData,
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        toast.error(err.message || "Image upload failed.", { id: toastId });
        return;
      }

      const { imageUrls } = await uploadRes.json();

      // Create product
      const productRes = await fetch("/api/supplier/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          basePrice: parseFloat(data.basePrice),
          stock: parseInt(data.stock),
          sizes: { available: selectedSizes },
          imageUrls,
        }),
      });

      const productResult = await productRes.json();

      if (!productRes.ok) {
        toast.error(productResult.message || "Failed to create product.", { id: toastId });
        return;
      }

      toast.success("Product created! One last step — please review our terms.", { id: toastId });
      router.push("/supplier/onboard/terms");
    } catch (err) {
      toast.error("Network error. Please check your connection and try again.", { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Product Name */}
      <div className="space-y-1">
        <Label htmlFor="name">
          Product Name <span className="text-brand-orange">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Black Leather Sneakers"
          className="focus-visible:ring-brand-orange"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div className="space-y-1">
          <Label htmlFor="category">
            Category <span className="text-brand-orange">*</span>
          </Label>
          <Select id="category" {...register("category")}>
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </Select>
          {errors.category && (
            <p className="text-xs text-destructive mt-1">{errors.category.message}</p>
          )}
        </div>

        {/* Stock */}
        <div className="space-y-1">
          <Label htmlFor="stock">
            Stock Quantity <span className="text-brand-orange">*</span>
          </Label>
          <Input
            id="stock"
            type="number"
            placeholder="e.g. 50"
            className="focus-visible:ring-brand-orange"
            {...register("stock")}
          />
          {errors.stock && (
            <p className="text-xs text-destructive mt-1">{errors.stock.message}</p>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your product... material, fit, features."
          rows={3}
          className="focus-visible:ring-brand-orange resize-none"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-xs text-destructive mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Base Price */}
      <div className="space-y-1">
        <Label htmlFor="basePrice">
          Your Cost Price (₦) <span className="text-brand-orange">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground text-sm">₦</span>
          </div>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            placeholder="5000"
            className="pl-8 focus-visible:ring-brand-orange"
            {...register("basePrice")}
          />
        </div>
        {errors.basePrice && (
          <p className="text-xs text-destructive mt-1">{errors.basePrice.message}</p>
        )}
        {basePrice && !isNaN(parseFloat(basePrice)) && parseFloat(basePrice) > 0 && (
          <div className="mt-2 p-3 bg-brand-charcoal/30 rounded-lg border border-brand-orange/20 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Selling price (with 10% markup):</span>
            <span className="font-bold text-brand-orange text-lg">
              ₦{(parseFloat(basePrice) * 1.10).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>

      {/* Delivery Method */}
      <div className="space-y-3 pt-2">
        <Label>
          Delivery Method <span className="text-brand-orange">*</span>
        </Label>
        <p className="text-sm text-muted-foreground">
          Choose how this product will be delivered to customers.
        </p>
        
        <div className="space-y-3">
          <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-brand-orange/50 transition-all duration-200">
            <input
              type="radio"
              value="SELF_DELIVERY"
              className="mt-1 text-brand-orange focus:ring-brand-orange"
              {...register("deliveryMethod")}
            />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Self-Delivery (Own Waybill)</p>
              <p className="text-sm text-muted-foreground mt-1">
                You handle delivery yourself • No logistics fee • Keep full profit
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You arrange delivery
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  No extra fees
                </span>
              </div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:border-brand-orange/50 transition-all duration-200">
            <input
              type="radio"
              value="PLATFORM_LOGISTICS"
              className="mt-1 text-brand-orange focus:ring-brand-orange"
              {...register("deliveryMethod")}
            />
            <div className="flex-1">
              <p className="font-semibold text-foreground">Platform Logistics</p>
              <p className="text-sm text-muted-foreground mt-1">
                Vendo handles delivery for you • More convenient • Logistics fee applies
              </p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Logistics Fee:</span>
                  <span className="font-bold text-brand-orange text-lg">
                    ₦{logisticsFee.toLocaleString()} per order
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  This fee will be deducted from your payout when a customer orders this product.
                </div>
                {basePrice && !isNaN(parseFloat(basePrice)) && parseFloat(basePrice) > 0 && (
                  <div className="mt-2 p-2 bg-brand-charcoal/20 rounded border border-brand-orange/10">
                    <div className="flex justify-between text-sm">
                      <span>Your payout per order:</span>
                      <span className="font-semibold">
                        ₦{(parseFloat(basePrice) * 1.10 - logisticsFee).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      (Selling price ₦{(parseFloat(basePrice) * 1.10).toLocaleString(undefined, { minimumFractionDigits: 2 })} - Logistics fee ₦{logisticsFee.toLocaleString()})
                    </div>
                  </div>
                )}
              </div>
            </div>
          </label>
        </div>
        {errors.deliveryMethod && (
          <p className="text-xs text-destructive mt-1">{errors.deliveryMethod.message}</p>
        )}
      </div>

      {/* Sizes */}
      {sizeOptions.length > 0 && (
        <div className="space-y-3 pt-2">
          <Label>
            Available Sizes <span className="text-brand-orange">*</span>
          </Label>
          <div className="flex flex-wrap gap-2">
            {sizeOptions.map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => toggleSize(size)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  selectedSizes.includes(size)
                    ? "bg-brand-orange text-white shadow-md scale-105"
                    : "bg-muted/50 text-foreground hover:bg-muted border border-transparent"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Images */}
      <div className="space-y-2 pt-2">
        <Label>
          Product Images <span className="text-brand-orange">*</span>
        </Label>
        <div className="border-2 border-dashed border-muted/50 rounded-lg p-6 hover:border-brand-orange transition-all duration-300">
          <input
            id="images"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <label
            htmlFor="images"
            className="cursor-pointer flex flex-col items-center gap-3 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-brand-charcoal/20 flex items-center justify-center text-brand-orange">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <span className="text-base font-medium text-foreground">
              Click to upload images (max 5)
            </span>
            <span className="text-sm text-muted-foreground">
              First image will be the thumbnail. Max 5MB per image.
            </span>
          </label>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-6">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg shadow-sm border border-muted/20"
                  />
                  {index === 0 && (
                    <div className="absolute bottom-1 left-1 right-1 bg-black/60 text-white text-[10px] text-center py-1 rounded backdrop-blur-sm">
                      Main Image
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        {imageError && (
          <p className="text-xs text-destructive mt-1">{imageError}</p>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-6 border-t border-muted/20">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/supplier/onboard/kyc")}
          className="flex-1 hover:bg-muted/50"
        >
          Back
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/supplier/onboard/terms")}
          className="flex-1 hover:bg-muted/50"
        >
          Skip for now
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {isSubmitting ? "Creating Product..." : "Save & Continue"}
        </Button>
      </div>
    </form>
  );
}
