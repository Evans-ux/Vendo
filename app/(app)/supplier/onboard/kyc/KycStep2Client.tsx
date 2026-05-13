"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

const kycSchema = z.object({
  docType: z.string().min(1, "Please select a document type"),
});

type KycFormData = z.infer<typeof kycSchema>;

export default function KycStep2Client() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: { docType: "" },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setFileError(null);

    if (!selected) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      setFileError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setFileError("File size must be less than 5MB.");
      return;
    }

    setFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setPreview(null);
    }
  };

  const onSubmit = async (data: KycFormData) => {
    if (!file) {
      setFileError("Please upload your identity document.");
      return;
    }

    const toastId = toast.loading("Uploading your document securely...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("docType", data.docType);

      const res = await fetch("/api/supplier/onboard/kyc", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Upload failed. Please try again.", { id: toastId });
        return;
      }

      toast.success("Document uploaded! Taking you to your dashboard.", { id: toastId });
      router.push("/supplier/dashboard");
    } catch {
      toast.error("Network error. Please check your connection and try again.", { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Info Box */}
      <div className="bg-brand-charcoal/50 border border-brand-orange/30 rounded-lg p-4">
        <h3 className="font-semibold text-sm text-brand-orange mb-2">Why KYC?</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All Vendo suppliers are verified to maintain a trusted marketplace for customers. Your
          document is stored securely and only reviewed by our admin team. Verification usually
          takes 24–48 hours.
        </p>
      </div>

      {/* Document Type */}
      <div className="space-y-1">
        <Label htmlFor="docType">
          Document Type <span className="text-brand-orange">*</span>
        </Label>
        <Select id="docType" {...register("docType")}>
          <option value="">Select document type</option>
          {KYC_DOC_TYPES.map((type) => (
            <option key={type.value} value={type.value}>{type.label}</option>
          ))}
        </Select>
        {errors.docType && (
          <p className="text-xs text-destructive mt-1">{errors.docType.message}</p>
        )}
      </div>

      {/* File Upload */}
      <div className="space-y-1">
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
          <label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-3">
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
                <div className="w-16 h-16 rounded-full bg-brand-charcoal/20 flex items-center justify-center text-brand-orange">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <span className="text-base font-medium text-foreground">
                  Click to upload or drag and drop
                </span>
                <span className="text-sm text-muted-foreground">JPG, PNG, or PDF — max 5MB.</span>
              </>
            )}
            {file && (
              <span className="text-sm font-medium text-brand-orange mt-1 bg-brand-orange/10 px-3 py-1 rounded-full">
                Selected: {file.name}
              </span>
            )}
          </label>
        </div>
        {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
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
          disabled={isSubmitting}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {isSubmitting ? "Uploading Document..." : "Submit & Go to Dashboard"}
        </Button>
      </div>
    </form>
  );
}
