"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";


const KYC_DOC_TYPES = [
  { value: "NIN", label: "National Identity Number (NIN)" },
  { value: "BVN", label: "Bank Verification Number (BVN)" },
  { value: "CAC", label: "CAC Certificate (Registered Business)" },
  { value: "Passport", label: "International Passport" },
  { value: "Driver's License", label: "Driver's License" },
];

export default function SupplierOnboardingStep2() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [docType, setDocType] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(selectedFile.type)) {
      alert("Please upload a JPG, PNG, or PDF file");
      return;
    }

    // Validate file size (max 5MB)
    if (selectedFile.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setFile(selectedFile);

    // Show preview for images
    if (selectedFile.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!docType || !file) {
      alert("Please select document type and upload a file");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Upload file to Supabase Storage
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", docType);

      const uploadRes = await fetch("/api/supplier/onboard/kyc", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        alert(error.message || "Upload failed");
        return;
      }

      // Move to products step
      router.push("/supplier/onboard/products");
    } catch (err) {
      console.error(err);
      alert("Failed to upload document. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Info Box */}
      <div className="bg-brand-charcoal/50 border border-brand-orange/30 rounded-lg p-4">
        <h3 className="font-semibold text-sm text-brand-orange mb-2">Why KYC?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We verify all suppliers to ensure a safe marketplace for customers. Your document
          is stored securely and only reviewed by our administrative team. Verification usually
          takes 24–48 hours.
        </p>
      </div>

      {/* Document Type */}
      <div className="space-y-2">
        <Label htmlFor="docType">
          Document Type <span className="text-brand-orange">*</span>
        </Label>
        <Select
          id="docType"
          value={docType}
          onChange={(e) => setDocType(e.target.value)}
          required
        >
          <option value="">Select document type</option>
          {KYC_DOC_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label htmlFor="file">
          Upload Document <span className="text-brand-orange">*</span>
        </Label>
        <div className="border-2 border-dashed border-muted/50 rounded-lg p-8 text-center hover:border-brand-orange hover:bg-brand-orange/5 transition-all duration-300">
          <input
            id="file"
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />
          <label
            htmlFor="file"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            {preview ? (
              <div className="relative group">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-48 rounded-lg shadow-md border border-muted/20"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <span className="text-white text-sm font-medium">Change File</span>
                </div>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-brand-charcoal/20 flex items-center justify-center text-brand-orange mb-2">
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <span className="text-base font-medium text-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-sm text-muted-foreground">
                  JPG, PNG, or PDF. Max 5MB.
                </span>
              </>
            )}
            {file && (
              <span className="text-sm font-medium text-brand-orange mt-2 bg-brand-orange/10 px-3 py-1 rounded-full">
                Selected: {file.name}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex gap-4 pt-4 border-t border-muted/20">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/supplier/onboard")}
          className="flex-1 hover:bg-muted/50"
        >
          Back
        </Button>
        <Button 
          type="submit" 
          disabled={loading} 
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {loading ? "Uploading Document..." : "Continue to Next Step"}
        </Button>
      </div>
    </form>
  );
}
