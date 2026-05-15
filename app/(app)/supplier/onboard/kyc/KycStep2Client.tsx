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
import { Input } from "@/components/ui/input";

const ID_DOC_TYPES = [
  { value: "NIN", label: "National Identity Number (NIN)" },
  { value: "BVN", label: "Bank Verification Number (BVN)" },
  { value: "Passport", label: "International Passport" },
  { value: "Driver's License", label: "Driver's License" },
];

const BUSINESS_DOC_TYPES = [
  { value: "CAC", label: "CAC Certificate (Registered Business)" },
  { value: "BANK_STATEMENT", label: "Bank Account Statement (Last 3 months)" },
];

const NIGERIAN_BANKS = [
  "Access Bank", "Citibank", "Ecobank", "Fidelity Bank", "First Bank of Nigeria",
  "First City Monument Bank (FCMB)", "Globus Bank", "Guaranty Trust Bank (GTBank)",
  "Heritage Bank", "Keystone Bank", "Kuda Bank", "Opay", "Palmpay", "Polaris Bank",
  "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank", "Sterling Bank",
  "SunTrust Bank", "Union Bank", "United Bank for Africa (UBA)", "Unity Bank",
  "Wema Bank", "Zenith Bank", "Other"
];

const kycSchema = z.object({
  // Step 1: Identity Document
  idDocType: z.string().min(1, "Please select an ID document type"),
  
  // Step 2: Business Verification
  businessDocType: z.string().min(1, "Please select a business document type"),
  
  // Step 3: Bank Account Details
  bankName: z.string().min(1, "Please select your bank"),
  accountNumber: z.string()
    .min(10, "Account number must be 10 digits")
    .max(10, "Account number must be 10 digits")
    .regex(/^\d+$/, "Account number must contain only numbers"),
  accountHolderName: z.string().min(2, "Please enter the account holder name"),
});

type KycFormData = z.infer<typeof kycSchema>;

export default function KycStep2Client() {
  const router = useRouter();
  
  // File states
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [idFileError, setIdFileError] = useState<string | null>(null);
  
  const [businessFile, setBusinessFile] = useState<File | null>(null);
  const [businessPreview, setBusinessPreview] = useState<string | null>(null);
  const [businessFileError, setBusinessFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      idDocType: "",
      businessDocType: "",
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
    },
  });

  const selectedBusinessDocType = watch("businessDocType");

  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setIdFileError(null);

    if (!selected) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      setIdFileError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setIdFileError("File size must be less than 5MB.");
      return;
    }

    setIdFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setIdPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setIdPreview(null);
    }
  };

  const handleBusinessFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    setBusinessFileError(null);

    if (!selected) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!validTypes.includes(selected.type)) {
      setBusinessFileError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setBusinessFileError("File size must be less than 10MB.");
      return;
    }

    setBusinessFile(selected);
    if (selected.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setBusinessPreview(reader.result as string);
      reader.readAsDataURL(selected);
    } else {
      setBusinessPreview(null);
    }
  };

  const onSubmit = async (data: KycFormData) => {
    // Validate files
    if (!idFile) {
      setIdFileError("Please upload your identity document.");
      return;
    }
    if (!businessFile) {
      setBusinessFileError("Please upload your business document.");
      return;
    }

    const toastId = toast.loading("Uploading your documents securely...");

    try {
      const formData = new FormData();
      
      // Identity document
      formData.append("idFile", idFile);
      formData.append("idDocType", data.idDocType);
      
      // Business document
      formData.append("businessFile", businessFile);
      formData.append("businessDocType", data.businessDocType);
      
      // Bank details
      formData.append("bankName", data.bankName);
      formData.append("accountNumber", data.accountNumber);
      formData.append("accountHolderName", data.accountHolderName);

      const res = await fetch("/api/supplier/onboard/kyc", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Upload failed. Please try again.", { id: toastId });
        return;
      }

      toast.success("Documents uploaded successfully!", { id: toastId });
      router.push("/supplier/onboard/products");
    } catch {
      toast.error("Network error. Please check your connection and try again.", { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Info Box */}
      <div className="bg-brand-charcoal/50 border border-brand-orange/30 rounded-lg p-4">
        <h3 className="font-semibold text-sm text-brand-orange mb-2">🔒 Secure Verification Process</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">
          All Vendo suppliers are verified to maintain a trusted marketplace. Your documents are encrypted
          and only reviewed by our admin team. Verification usually takes 24–48 hours.
        </p>
      </div>

      {/* STEP 1: Identity Document */}
      <div className="space-y-4 p-6 border border-muted/30 rounded-xl bg-muted/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h3 className="text-lg font-semibold text-foreground">Identity Verification</h3>
        </div>

        <div className="space-y-1">
          <Label htmlFor="idDocType">
            ID Document Type <span className="text-brand-orange">*</span>
          </Label>
          <Select id="idDocType" {...register("idDocType")}>
            <option value="">Select your ID type</option>
            {ID_DOC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
          {errors.idDocType && (
            <p className="text-xs text-destructive mt-1">{errors.idDocType.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="idFile">
            Upload ID Document <span className="text-brand-orange">*</span>
          </Label>
          <div className="border-2 border-dashed border-muted/50 rounded-lg p-6 text-center hover:border-brand-orange hover:bg-brand-orange/5 transition-all">
            <input
              id="idFile"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleIdFileChange}
              className="hidden"
            />
            <label htmlFor="idFile" className="cursor-pointer flex flex-col items-center gap-2">
              {idPreview ? (
                <img src={idPreview} alt="ID Preview" className="max-h-32 rounded-lg shadow-md" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-charcoal/20 flex items-center justify-center text-brand-orange">
                  📄
                </div>
              )}
              <span className="text-sm font-medium">
                {idFile ? idFile.name : "Click to upload ID (JPG, PNG, PDF - max 5MB)"}
              </span>
            </label>
          </div>
          {idFileError && <p className="text-xs text-destructive mt-1">{idFileError}</p>}
        </div>
      </div>

      {/* STEP 2: Business Verification */}
      <div className="space-y-4 p-6 border border-muted/30 rounded-xl bg-muted/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
          <h3 className="text-lg font-semibold text-foreground">Business Verification</h3>
        </div>

        <div className="space-y-1">
          <Label htmlFor="businessDocType">
            Business Document Type <span className="text-brand-orange">*</span>
          </Label>
          <Select id="businessDocType" {...register("businessDocType")}>
            <option value="">Choose one option</option>
            {BUSINESS_DOC_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </Select>
          {errors.businessDocType && (
            <p className="text-xs text-destructive mt-1">{errors.businessDocType.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {selectedBusinessDocType === "CAC" && "Upload your CAC certificate if you have a registered business"}
            {selectedBusinessDocType === "BANK_STATEMENT" && "Upload your bank statement from the last 3 months"}
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="businessFile">
            Upload Business Document <span className="text-brand-orange">*</span>
          </Label>
          <div className="border-2 border-dashed border-muted/50 rounded-lg p-6 text-center hover:border-brand-orange hover:bg-brand-orange/5 transition-all">
            <input
              id="businessFile"
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              onChange={handleBusinessFileChange}
              className="hidden"
            />
            <label htmlFor="businessFile" className="cursor-pointer flex flex-col items-center gap-2">
              {businessPreview ? (
                <img src={businessPreview} alt="Business Doc Preview" className="max-h-32 rounded-lg shadow-md" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-brand-charcoal/20 flex items-center justify-center text-brand-orange">
                  🏢
                </div>
              )}
              <span className="text-sm font-medium">
                {businessFile ? businessFile.name : "Click to upload document (JPG, PNG, PDF - max 10MB)"}
              </span>
            </label>
          </div>
          {businessFileError && <p className="text-xs text-destructive mt-1">{businessFileError}</p>}
        </div>
      </div>

      {/* STEP 3: Bank Account Details */}
      <div className="space-y-4 p-6 border border-muted/30 rounded-xl bg-muted/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm">
            3
          </div>
          <h3 className="text-lg font-semibold text-foreground">Bank Account Details</h3>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          💰 This is where you'll receive payments. You can update these details later from your dashboard.
        </p>

        <div className="space-y-1">
          <Label htmlFor="bankName">
            Bank Name <span className="text-brand-orange">*</span>
          </Label>
          <Select id="bankName" {...register("bankName")}>
            <option value="">Select your bank</option>
            {NIGERIAN_BANKS.map((bank) => (
              <option key={bank} value={bank}>{bank}</option>
            ))}
          </Select>
          {errors.bankName && (
            <p className="text-xs text-destructive mt-1">{errors.bankName.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="accountNumber">
            Account Number <span className="text-brand-orange">*</span>
          </Label>
          <Input
            id="accountNumber"
            type="text"
            placeholder="0123456789"
            maxLength={10}
            {...register("accountNumber")}
          />
          {errors.accountNumber && (
            <p className="text-xs text-destructive mt-1">{errors.accountNumber.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="accountHolderName">
            Account Holder Name <span className="text-brand-orange">*</span>
          </Label>
          <Input
            id="accountHolderName"
            type="text"
            placeholder="Must match your business or personal name"
            {...register("accountHolderName")}
          />
          {errors.accountHolderName && (
            <p className="text-xs text-destructive mt-1">{errors.accountHolderName.message}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            ⚠️ Account name must match your business name or your personal name on your ID
          </p>
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
          ← Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white"
        >
          {isSubmitting ? "Uploading..." : "Submit for Verification →"}
        </Button>
      </div>
    </form>
  );
}
