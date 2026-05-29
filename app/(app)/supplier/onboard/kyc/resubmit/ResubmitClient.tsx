"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/app/(app)/supplier/dashboard/card";
import { Button } from "@/app/(app)/supplier/dashboard/button";
import { Input } from "@/app/(app)/supplier/dashboard/input";
import { AlertTriangle, ChevronLeft, Loader2, CheckCircle, Building2 } from "lucide-react";

interface Bank {
  code: string;
  name: string;
}

export default function ResubmitClient({ businessName, reason }: { businessName: string; reason: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);

  // State for IDs
  const [kycDocType, setKycDocType] = useState("NIN");
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [businessDocType, setBusinessDocType] = useState("CAC");
  const [businessFile, setBusinessFile] = useState<File | null>(null);

  // Bank Verification State
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "verified" | "error">("idle");
  const [verifiedName, setVerifiedName] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Load Banks from Flutterwave API
  useEffect(() => {
    async function loadBanks() {
      try {
        const res = await fetch("/api/supplier/onboard/banks");
        const data = await res.json();
        if (res.ok && data.banks) setBanks(data.banks);
      } catch (err) {
        toast.error("Could not load bank list.");
      } finally {
        setBanksLoading(false);
      }
    }
    loadBanks();
  }, []);

  // Reset verification when bank or account number changes
  useEffect(() => {
    setVerifyState("idle");
    setVerifiedName(null);
    setVerifyError(null);
  }, [bankCode, accountNumber]);

  const verifyAccount = useCallback(async () => {
    if (!bankCode || accountNumber.length !== 10) {
      toast.error("Select a bank and enter a 10-digit account number first.");
      return;
    }
    setVerifyState("loading");
    try {
      const res = await fetch(`/api/supplier/onboard/verify-account?account_number=${accountNumber}&account_bank=${bankCode}`);
      const data = await res.json();
      if (!res.ok) {
        setVerifyState("error");
        setVerifyError(data.message || "Verification failed.");
        return;
      }
      setVerifyState("verified");
      setVerifiedName(data.account_name);
    } catch {
      setVerifyState("error");
      setVerifyError("Network error.");
    }
  }, [bankCode, accountNumber]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFile || !businessFile || verifyState !== "verified" || !verifiedName) {
      toast.error("Please provide all required documents and verified bank details.");
      return;
    }

    setLoading(true);
    const selectedBank = banks.find(b => b.code === bankCode);
    const formData = new FormData();
    formData.append("kycDocType", kycDocType);
    formData.append("kycFile", kycFile);
    formData.append("businessDocType", businessDocType);
    formData.append("businessFile", businessFile);
    formData.append("bankName", selectedBank?.name || "");
    formData.append("bankCode", bankCode);
    formData.append("accountNumber", accountNumber);
    formData.append("accountHolderName", verifiedName);

    try {
      const res = await fetch("/api/supplier/kyc/resubmit", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok) {
        toast.success("Documents resubmitted successfully!");
        router.push("/supplier/dashboard");
        router.refresh();
      } else {
        toast.error(data.error || "Resubmission failed");
      }
    } catch (err) {
      toast.error("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <button 
        onClick={() => router.push("/supplier/dashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      <Card className="border-red-500/20 bg-red-500/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <CardTitle className="text-lg">Reason for Rejection</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{reason}</p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Re-upload Verification Documents</CardTitle>
            <CardDescription>Update your information for {businessName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Identity Document */}
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">1. Identity Verification</p>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Document Type</label>
                <select 
                  value={kycDocType}
                  onChange={(e) => setKycDocType(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="NIN">National Identity Number (NIN)</option>
                  <option value="BVN">Bank Verification Number (BVN)</option>
                  <option value="PASSPORT">International Passport</option>
                  <option value="LICENSE">Driver's License</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">ID Document File</label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setKycFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Business Document */}
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">2. Business Verification</p>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Document Type</label>
                <select 
                  value={businessDocType}
                  onChange={(e) => setBusinessDocType(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="CAC">CAC Certificate</option>
                  <option value="STATEMENT">Bank Statement (Last 3 months)</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Business Document File</label>
                <Input type="file" accept="image/*,.pdf" onChange={(e) => setBusinessFile(e.target.files?.[0] || null)} />
              </div>
            </div>

            {/* Bank Details */}
            <div className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">3. Payout Account Details</p>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Select Bank</label>
                  {banksLoading ? (
                    <div className="h-10 border rounded-md bg-muted animate-pulse" />
                  ) : (
                    <select 
                      value={bankCode}
                      onChange={(e) => setBankCode(e.target.value)}
                      className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                    >
                      <option value="">Select your bank</option>
                      {banks.map(b => <option key={b.code} value={b.code}>{b.name}</option>)}
                    </select>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 grid gap-2">
                    <label className="text-sm font-medium">Account Number</label>
                    <Input 
                      value={accountNumber} 
                      onChange={(e) => setAccountNumber(e.target.value)} 
                      placeholder="10-digit number" 
                      maxLength={10} 
                    />
                  </div>
                  <Button 
                    type="button" 
                    onClick={verifyAccount}
                    disabled={verifyState === "loading" || !bankCode || accountNumber.length !== 10}
                    className="sm:mt-7 bg-brand-orange hover:bg-brand-orange/90"
                  >
                    {verifyState === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
                  </Button>
                </div>
              </div>

              {verifyState === "verified" && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-green-600 dark:text-green-400">Account Verified</p>
                    <p className="text-sm font-medium">{verifiedName}</p>
                  </div>
                </div>
              )}

              {verifyState === "error" && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">{verifyError}</p>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                Account name must match your business or owner name for approval.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={loading || verifyState !== "verified"} className="w-full h-12 text-lg">
              {loading ? "Uploading..." : "Submit for Re-verification"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}