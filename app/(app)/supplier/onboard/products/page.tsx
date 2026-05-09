"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";


const PRODUCT_CATEGORIES = [
  "Footwear",
  "Tops",
  "Bottoms",
  "Dresses",
  "Accessories",
  "Bags",
  "Jewelry",
  "Other",
];

const SIZE_PRESETS = {
  Footwear: ["38", "39", "40", "41", "42", "43", "44", "45"],
  Tops: ["XS", "S", "M", "L", "XL", "XXL"],
  Bottoms: ["XS", "S", "M", "L", "XL", "XXL"],
  Dresses: ["XS", "S", "M", "L", "XL", "XXL"],
  Other: [],
};

export default function SupplierOnboardingStep3() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "",
    basePrice: "",
    stock: "",
  });
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate max 5 images
    if (images.length + files.length > 5) {
      alert("Maximum 5 images allowed");
      return;
    }

    // Validate file types and sizes
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        alert(`${file.name} is not an image`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is larger than 5MB`);
        return false;
      }
      return true;
    });

    setImages([...images, ...validFiles]);

    // Generate previews
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (images.length === 0) {
      alert("Please upload at least one product image");
      return;
    }

    if (selectedSizes.length === 0) {
      alert("Please select at least one size");
      return;
    }

    setLoading(true);

    try {
      // Upload images first
      const imageFormData = new FormData();
      images.forEach((image) => {
        imageFormData.append("images", image);
      });

      const uploadRes = await fetch("/api/supplier/products/upload-images", {
        method: "POST",
        body: imageFormData,
      });

      if (!uploadRes.ok) {
        throw new Error("Image upload failed");
      }

      const { imageUrls } = await uploadRes.json();

      // Create product
      const productData = {
        ...formData,
        basePrice: parseFloat(formData.basePrice),
        stock: parseInt(formData.stock),
        sizes: { available: selectedSizes },
        imageUrls,
      };

      const productRes = await fetch("/api/supplier/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });

      if (!productRes.ok) {
        const error = await productRes.json();
        alert(error.message || "Failed to create product");
        return;
      }

      // Onboarding product step complete — redirect to Terms & Conditions
      router.push("/supplier/terms");
    } catch (err) {
      console.error(err);
      alert("Failed to create product. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const sizeOptions =
    formData.category && SIZE_PRESETS[formData.category as keyof typeof SIZE_PRESETS]
      ? SIZE_PRESETS[formData.category as keyof typeof SIZE_PRESETS]
      : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Product Name */}
      <div className="space-y-2">
        <Label htmlFor="name">
          Product Name <span className="text-brand-orange">*</span>
        </Label>
        <Input
          id="name"
          placeholder="e.g. Black Leather Sneakers"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
          className="focus-visible:ring-brand-orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category */}
        <div className="space-y-2">
          <Label htmlFor="category">
            Category <span className="text-brand-orange">*</span>
          </Label>
          <Select
            id="category"
            value={formData.category}
            onChange={(e) => {
              setFormData({ ...formData, category: e.target.value });
              setSelectedSizes([]); // Reset sizes when category changes
            }}
            required
          >
            <option value="">Select category</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </Select>
        </div>

        {/* Stock */}
        <div className="space-y-2">
          <Label htmlFor="stock">
            Stock Quantity <span className="text-brand-orange">*</span>
          </Label>
          <Input
            id="stock"
            type="number"
            placeholder="e.g. 50"
            value={formData.stock}
            onChange={(e) =>
              setFormData({ ...formData, stock: e.target.value })
            }
            required
            className="focus-visible:ring-brand-orange"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your product... material, fit, features. This will determine whether or not your goods will sell first."
          rows={3}
          value={formData.description}
          onChange={(e) =>
            setFormData({ ...formData, description: e.target.value })
          }
          className="focus-visible:ring-brand-orange resize-none"
        />
      </div>

      {/* Base Price */}
      <div className="space-y-2">
        <Label htmlFor="basePrice">
          Your Cost Price (₦) <span className="text-brand-orange">*</span>
        </Label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-muted-foreground sm:text-sm">₦</span>
          </div>
          <Input
            id="basePrice"
            type="number"
            step="0.01"
            placeholder="5000"
            value={formData.basePrice}
            onChange={(e) =>
              setFormData({ ...formData, basePrice: e.target.value })
            }
            required
            className="pl-8 focus-visible:ring-brand-orange"
          />
        </div>
        {formData.basePrice && (
          <div className="mt-2 p-3 bg-brand-charcoal/30 rounded-lg border border-brand-orange/20 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Selling price (with 25% markup):</span>
            <span className="font-bold text-brand-orange text-lg">
              ₦{(parseFloat(formData.basePrice) * 1.25).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
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
                    ? "bg-brand-orange text-white shadow-md transform scale-105"
                    : "bg-muted/50 text-foreground hover:bg-muted hover:border-brand-orange/50 border border-transparent"
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
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
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
                    className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110"
                  >
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
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
          type="submit" 
          disabled={loading} 
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {loading ? "Creating Product..." : "Complete Setup"}
        </Button>
      </div>
    </form>
  );
}
