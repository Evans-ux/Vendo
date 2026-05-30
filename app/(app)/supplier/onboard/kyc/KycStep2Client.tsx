"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle, Loader2, AlertCircle, Building2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bank {
  code: string;
  name: string;
}

type VerifyState = "idle" | "loading" | "verified" | "error";

// ─── Constants ────────────────────────────────────────────────────────────────

const ID_DOC_TYPES = [
  { value: "NIN",              label: "National Identity Number (NIN)" },
  { value: "BVN",              label: "Bank Verification Number (BVN)" },
  { value: "Passport",         label: "International Passport" },
  { value: "Driver's License", label: "Driver's License" },
];

const BUSINESS_DOC_TYPES = [
  { value: "CAC",            label: "CAC Certificate (Registered Business)" },
  { value: "BANK_STATEMENT", label: "Bank Account Statement (Last 3 months)" },
];

// ─── Schema ───────────────────────────────────────────────────────────────────

const kycSchema = z.object({
  idDocType:       z.string().min(1, "Please select an ID document type"),
  businessDocType: z.string().min(1, "Please select a business document type"),
  bankCode:        z.string().min(1, "Please select your bank"),
  accountNumber:   z
    .string()
    .length(10, "Account number must be exactly 10 digits")
    .regex(/^\d+$/, "Account number must contain only numbers"),
});

type KycFormData = z.infer<typeof kycSchema>;

// ─── Component ────────────────────────────────────────────────────────────────

export default function KycStep2Client() {
  const router = useRouter();

  // Bank list
  const [banks, setBanks]           = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  // File states
  const [idFile, setIdFile]             = useState<File | null>(null);
  const [idPreview, setIdPreview]       = useState<string | null>(null);
  const [idFileError, setIdFileError]   = useState<string | null>(null);

  const [businessFile, setBusinessFile]           = useState<File | null>(null);
  const [businessPreview, setBusinessPreview]     = useState<string | null>(null);
  const [businessFileError, setBusinessFileError] = useState<string | null>(null);

  // Account verification
  const [verifyState, setVerifyState]       = useState<VerifyState>("idle");
  const [verifiedName, setVerifiedName]     = useState<string | null>(null);
  const [verifyError, setVerifyError]       = useState<string | null>(null);
  const [verifiedBankCode, setVerifiedBankCode] = useState<string | null>(null);
  const [verifiedAccNumber, setVerifiedAccNumber] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      idDocType: "", businessDocType: "", bankCode: "", accountNumber: "",
    },
  });

  const selectedBusinessDocType = watch("businessDocType");
  const watchedBankCode         = watch("bankCode");
  const watchedAccountNumber    = watch("accountNumber");

  // ── Load bank list from Flutterwave ────────────────────────────────────────
  useEffect(() => {
    async function loadBanks() {
      try {
        const res  = await fetch("/api/supplier/onboard/banks");
        const data = await res.json();
        if (res.ok && data.banks) {
          setBanks(data.banks);
        } else {
          console.error("Bank load error:", data);
          toast.error(data.message || "Could not load bank list. Please refresh.");
        }
      } catch (err: any) {
        console.error("Bank fetch network error:", err);
        toast.error("Could not load bank list. Please check your connection.");
      } finally {
        setBanksLoading(false);
      }
    }
    loadBanks();
  }, []);

  // ── Reset verification when bank or account number changes ─────────────────
  useEffect(() => {
    if (
      verifiedBankCode !== watchedBankCode ||
      verifiedAccNumber !== watchedAccountNumber
    ) {
      setVerifyState("idle");
      setVerifiedName(null);
      setVerifyError(null);
    }
  }, [watchedBankCode, watchedAccountNumber, verifiedBankCode, verifiedAccNumber]);

  // ── Verify account via Flutterwave ─────────────────────────────────────────
  const verifyAccount = useCallback(async () => {
    if (!watchedBankCode || watchedAccountNumber.length !== 10) {
      toast.error("Select a bank and enter a 10-digit account number first.");
      return;
    }

    setVerifyState("loading");
    setVerifiedName(null);
    setVerifyError(null);

    try {
      const res = await fetch(
        `/api/supplier/onboard/verify-account?account_number=${watchedAccountNumber}&account_bank=${watchedBankCode}`
      );
      const data = await res.json();

      if (!res.ok) {
        setVerifyState("error");
        setVerifyError(data.message || "Verification failed. Check your details.");
        return;
      }

      setVerifyState("verified");
      setVerifiedName(data.account_name);
      setVerifiedBankCode(watchedBankCode);
      setVerifiedAccNumber(watchedAccountNumber);
    } catch {
      setVerifyState("error");
      setVerifyError("Network error. Please try again.");
    }
  }, [watchedBankCode, watchedAccountNumber]);

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleIdFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setIdFileError(null);
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type)) {
      setIdFileError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setIdFileError("File size must be less than 5MB.");
      return;
    }
    setIdFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setIdPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setIdPreview(null);
    }
  };

  const handleBusinessFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setBusinessFileError(null);
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "application/pdf"].includes(file.type)) {
      setBusinessFileError("Please upload a JPG, PNG, or PDF file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setBusinessFileError("File size must be less than 10MB.");
      return;
    }
    setBusinessFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => setBusinessPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setBusinessPreview(null);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: KycFormData) => {
    if (!idFile) {
      setIdFileError("Please upload your identity document.");
      return;
    }
    if (!businessFile) {
      setBusinessFileError("Please upload your business document.");
      return;
    }
    if (verifyState !== "verified" || !verifiedName) {
      toast.error("Please verify your bank account before submitting.");
      return;
    }

    const selectedBank = banks.find((b) => b.code === data.bankCode);
    const toastId = toast.loading("Uploading your documents securely...");

    try {
      const formData = new FormData();
      formData.append("idFile",            idFile);
      formData.append("idDocType",         data.idDocType);
      formData.append("businessFile",      businessFile);
      formData.append("businessDocType",   data.businessDocType);
      formData.append("bankName",          selectedBank?.name ?? data.bankCode);
      formData.append("bankCode",          data.bankCode);
      formData.append("accountNumber",     data.accountNumber);
      formData.append("accountHolderName", verifiedName); // use Flutterwave-verified name

      const res    = await fetch("/api/supplier/onboard/kyc", { method: "POST", body: formData });
      const result = await res.json();

      if (!res.ok) {
        toast.error(result.message || "Upload failed. Please try again.", { id: toastId });
        return;
      }

      toast.success("Documents submitted successfully!", { id: toastId });
      router.push("/supplier/onboard/products");
    } catch {
      toast.error("Network error. Please check your connection and try again.", { id: toastId });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

      {/* Info banner */}
      <div className="bg-brand-orange/5 border border-brand-orange/25 rounded-xl p-4 flex gap-3">
        <span className="text-brand-orange text-lg flex-shrink-0">🔒</span>
        <div>
          <p className="font-semibold text-sm text-brand-orange mb-0.5">Secure Verification Process</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All documents are encrypted and only reviewed by our admin team. Verification takes 24–48 hours.
          </p>
        </div>
      </div>

      {/* ── STEP 1: Identity Document ── */}
      <div className="space-y-4 p-4 sm:p-6 border border-border rounded-xl bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm flex-shrink-0">1</div>
          <h3 className="text-base font-bold text-foreground">Identity Verification</h3>
        </div>

        <div className="space-y-1">
          <Label htmlFor="idDocType">ID Document Type <span className="text-brand-orange">*</span></Label>
          <select
            id="idDocType"
            {...register("idDocType")}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            <option value="">Select your ID type</option>
            {ID_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.idDocType && <p className="text-xs text-destructive mt-1">{errors.idDocType.message}</p>}
        </div>

        <div className="space-y-1">
          <Label htmlFor="idFile">Upload ID Document <span className="text-brand-orange">*</span></Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-brand-orange hover:bg-brand-orange/5 transition-all cursor-pointer">
            <input id="idFile" type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleIdFileChange} className="hidden" />
            <label htmlFor="idFile" className="cursor-pointer flex flex-col items-center gap-2">
              {idPreview ? (
                <img src={idPreview} alt="ID Preview" className="max-h-32 rounded-lg shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">📄</div>
              )}
              <span className="text-sm font-medium text-foreground">
                {idFile ? idFile.name : "Click to upload (JPG, PNG, PDF · max 5MB)"}
              </span>
            </label>
          </div>
          {idFileError && <p className="text-xs text-destructive mt-1">{idFileError}</p>}
        </div>
      </div>

      {/* ── STEP 2: Business Document ── */}
      <div className="space-y-4 p-4 sm:p-6 border border-border rounded-xl bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm flex-shrink-0">2</div>
          <h3 className="text-base font-bold text-foreground">Business Verification</h3>
        </div>

        <div className="space-y-1">
          <Label htmlFor="businessDocType">Business Document Type <span className="text-brand-orange">*</span></Label>
          <select
            id="businessDocType"
            {...register("businessDocType")}
            className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            <option value="">Choose one option</option>
            {BUSINESS_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {errors.businessDocType && <p className="text-xs text-destructive mt-1">{errors.businessDocType.message}</p>}
          {selectedBusinessDocType === "CAC" && (
            <p className="text-xs text-muted-foreground mt-1">Upload your CAC certificate if you have a registered business</p>
          )}
          {selectedBusinessDocType === "BANK_STATEMENT" && (
            <p className="text-xs text-muted-foreground mt-1">Upload your bank statement from the last 3 months</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="businessFile">Upload Business Document <span className="text-brand-orange">*</span></Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-brand-orange hover:bg-brand-orange/5 transition-all cursor-pointer">
            <input id="businessFile" type="file" accept="image/jpeg,image/jpg,image/png,application/pdf" onChange={handleBusinessFileChange} className="hidden" />
            <label htmlFor="businessFile" className="cursor-pointer flex flex-col items-center gap-2">
              {businessPreview ? (
                <img src={businessPreview} alt="Business Doc Preview" className="max-h-32 rounded-lg shadow-sm" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-2xl">🏢</div>
              )}
              <span className="text-sm font-medium text-foreground">
                {businessFile ? businessFile.name : "Click to upload (JPG, PNG, PDF · max 10MB)"}
              </span>
            </label>
          </div>
          {businessFileError && <p className="text-xs text-destructive mt-1">{businessFileError}</p>}
        </div>
      </div>

      {/* ── STEP 3: Bank Account + Flutterwave Verification ── */}
      <div className="space-y-5 p-4 sm:p-6 border border-border rounded-xl bg-card">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-sm flex-shrink-0">3</div>
          <div>
            <h3 className="text-base font-bold text-foreground">Payout Bank Account</h3>
            <p className="text-xs text-muted-foreground mt-0.5">This is where your earnings will be sent after each sale</p>
          </div>
        </div>

        {/* Bank selector */}
        <div className="space-y-1">
          <Label htmlFor="bankCode">Bank Name <span className="text-brand-orange">*</span></Label>
          {banksLoading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading banks...
            </div>
          ) : (
            <select
              id="bankCode"
              {...register("bankCode")}
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="">Select your bank</option>
              {banks.map((b) => (
                <option
  key={`${b.code}-${b.name}`}
   value={b.code}
   >{b.name}</option>
              ))}
            </select>
          )}
          {errors.bankCode && <p className="text-xs text-destructive mt-1">{errors.bankCode.message}</p>}
        </div>

        {/* Account number + verify button */}
        <div className="space-y-1">
          <Label htmlFor="accountNumber">Account Number <span className="text-brand-orange">*</span></Label>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              placeholder="0123456789"
              maxLength={10}
              className="flex-1 focus-visible:ring-brand-orange"
              {...register("accountNumber")}
            />
            <button
              type="button"
              onClick={verifyAccount}
              disabled={
                verifyState === "loading" ||
                !watchedBankCode ||
                watchedAccountNumber.length !== 10
              }
              className="px-4 py-2.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 sm:w-auto w-full"
            >
              {verifyState === "loading" ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</>
              ) : (
                "Verify Account"
              )}
            </button>
          </div>
          {errors.accountNumber && <p className="text-xs text-destructive mt-1">{errors.accountNumber.message}</p>}
        </div>

        {/* Verification result */}
        {verifyState === "verified" && verifiedName && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-green-700 dark:text-green-300">Account Verified ✓</p>
              <p className="text-base font-semibold text-foreground mt-0.5">{verifiedName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Confirm this is your name. Payouts will be sent to this account.
              </p>
            </div>
          </div>
        )}

        {verifyState === "error" && verifyError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Verification Failed</p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">{verifyError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Double-check your account number and bank, then try again.
              </p>
            </div>
          </div>
        )}

        {verifyState === "idle" && watchedBankCode && watchedAccountNumber.length === 10 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5" />
            Click "Verify Account" to confirm your account name via Flutterwave
          </p>
        )}

        <div className="pt-2 p-3 rounded-xl bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Why we verify:</span> Flutterwave confirms your account name in real-time to prevent payout errors. Your bank details are stored securely and only used for sending your earnings.
          </p>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 border-t border-border mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/supplier/onboard")}
          className="w-full sm:flex-1 py-6 sm:py-4 h-auto"
        >
          ← Back
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || verifyState !== "verified"}
          className="w-full sm:flex-1 bg-brand-orange hover:bg-brand-orange/90 text-white disabled:opacity-50 py-6 sm:py-4 h-auto text-sm sm:text-base whitespace-normal"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" />Uploading...</>
          ) : (
            "Submit for Verification →"
          )}
        </Button>
      </div>

      {verifyState !== "verified" && (
        <p className="text-xs text-center text-muted-foreground -mt-2">
          You must verify your bank account before submitting
        </p>
      )}
    </form>
  );
}
