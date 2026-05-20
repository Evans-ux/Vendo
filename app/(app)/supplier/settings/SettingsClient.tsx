"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Eye, EyeOff, Loader2, CheckCircle, AlertCircle,
  Building2, Lock, User, ChevronRight
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Bank { code: string; name: string }

interface SettingsClientProps {
  supplierId: string;
  businessName: string;
  phone: string;
  state: string | null;
  bio: string | null;
  bankName: string | null;
  bankCode: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  hasPin: boolean;
}

type Tab = "profile" | "bank" | "pin";

// ─── PIN Input ────────────────────────────────────────────────────────────────

function PinField({
  value, onChange, label, placeholder = "••••",
}: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={4}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder={placeholder}
          className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-brand-orange"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsClient({
  businessName, phone, state, bio,
  bankName, bankCode, accountNumber, accountHolderName, hasPin,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Profile state ──
  const [profileForm, setProfileForm] = useState({ businessName, phone, state: state ?? "", bio: bio ?? "" });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Bank state ──
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState(bankCode ?? "");
  const [accNumber, setAccNumber] = useState(accountNumber ?? "");
  const [verifyState, setVerifyState] = useState<"idle" | "loading" | "verified" | "error">(
    accountHolderName ? "verified" : "idle"
  );
  const [verifiedName, setVerifiedName] = useState(accountHolderName ?? "");
  const [verifyError, setVerifyError] = useState("");
  const [bankPin, setBankPin] = useState("");
  const [savingBank, setSavingBank] = useState(false);

  // ── PIN state ──
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // Load banks
  useEffect(() => {
    if (activeTab !== "bank") return;
    setBanksLoading(true);
    fetch("/api/supplier/onboard/banks")
      .then((r) => r.json())
      .then((d) => { if (d.banks) setBanks(d.banks); })
      .catch(() => toast.error("Could not load bank list"))
      .finally(() => setBanksLoading(false));
  }, [activeTab]);

  // Reset verification when bank/account changes
  useEffect(() => {
    if (selectedBankCode !== bankCode || accNumber !== accountNumber) {
      setVerifyState("idle");
      setVerifiedName("");
      setVerifyError("");
    }
  }, [selectedBankCode, accNumber, bankCode, accountNumber]);

  // Verify account
  const verifyAccount = useCallback(async () => {
    if (!selectedBankCode || accNumber.length !== 10) return;
    setVerifyState("loading");
    setVerifyError("");
    try {
      const res = await fetch(
        `/api/supplier/onboard/verify-account?account_number=${accNumber}&account_bank=${selectedBankCode}`
      );
      const data = await res.json();
      if (!res.ok) {
        setVerifyState("error");
        setVerifyError(data.message || "Verification failed");
        return;
      }
      setVerifyState("verified");
      setVerifiedName(data.account_name);
    } catch {
      setVerifyState("error");
      setVerifyError("Network error. Please try again.");
    }
  }, [selectedBankCode, accNumber]);

  // ── Handlers ──

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/supplier/onboard/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profileForm, supplierType: "LOCAL" }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to save"); return; }
      toast.success("Profile updated");
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setSavingProfile(false); }
  };

  const handleSaveBank = async () => {
    if (verifyState !== "verified") { toast.error("Verify your account first"); return; }
    if (bankPin.length !== 4) { toast.error("Enter your 4-digit PIN to confirm"); return; }
    const selectedBank = banks.find((b) => b.code === selectedBankCode);
    setSavingBank(true);
    try {
      const res = await fetch("/api/supplier/settings/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: bankPin,
          bankCode: selectedBankCode,
          bankName: selectedBank?.name ?? bankName,
          accountNumber: accNumber,
          accountHolderName: verifiedName,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update bank"); return; }
      toast.success("Bank account updated");
      setBankPin("");
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setSavingBank(false); }
  };

  const handleSavePin = async () => {
    if (newPin.length !== 4) { toast.error("PIN must be 4 digits"); return; }
    if (newPin !== confirmPin) { toast.error("PINs do not match"); return; }
    if (hasPin && currentPin.length !== 4) { toast.error("Enter your current PIN"); return; }
    setSavingPin(true);
    try {
      const res = await fetch("/api/supplier/settings/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: hasPin ? currentPin : undefined, pin: newPin, confirmPin }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update PIN"); return; }
      toast.success(data.message);
      setCurrentPin(""); setNewPin(""); setConfirmPin("");
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setSavingPin(false); }
  };

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "profile", label: "Profile",      icon: <User className="w-4 h-4" /> },
    { key: "bank",    label: "Bank Account", icon: <Building2 className="w-4 h-4" /> },
    { key: "pin",     label: "Withdrawal PIN", icon: <Lock className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-xs text-muted-foreground">Manage your account</p>
          </div>
          <button
            onClick={() => router.push("/supplier/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Tab nav */}
        <div className="flex flex-col sm:flex-row gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all flex-1 justify-between sm:justify-center ${
                activeTab === t.key
                  ? "bg-brand-orange text-white shadow-md shadow-brand-orange/25"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/30"
              }`}
            >
              <span className="flex items-center gap-2">{t.icon}{t.label}</span>
              <ChevronRight className={`w-4 h-4 sm:hidden ${activeTab === t.key ? "opacity-100" : "opacity-40"}`} />
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <h2 className="font-bold text-foreground">Business Profile</h2>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Business Name</label>
              <input
                value={profileForm.businessName}
                onChange={(e) => setProfileForm((p) => ({ ...p, businessName: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Phone Number</label>
              <input
                value={profileForm.phone}
                onChange={(e) => setProfileForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Store Description</label>
              <textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm((p) => ({ ...p, bio: e.target.value }))}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange resize-none"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingProfile ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Profile"}
            </button>
          </div>
        )}

        {/* ── Bank Tab ── */}
        {activeTab === "bank" && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <h2 className="font-bold text-foreground">Payout Bank Account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                This account receives your earnings. PIN required to change.
              </p>
            </div>

            {/* Current bank */}
            {bankName && accountNumber && (
              <div className="p-4 rounded-xl bg-surface border border-border">
                <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-2">Current Account</p>
                <p className="font-semibold text-foreground">{accountHolderName}</p>
                <p className="text-sm text-muted-foreground">{bankName} · {accountNumber}</p>
              </div>
            )}

            {/* Bank selector */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">New Bank</label>
              {banksLoading ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-muted/30 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />Loading banks...
                </div>
              ) : (
                <select
                  value={selectedBankCode}
                  onChange={(e) => setSelectedBankCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="">Select bank</option>
                  {banks.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                </select>
              )}
            </div>

            {/* Account number + verify */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Account Number</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  value={accNumber}
                  onChange={(e) => setAccNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0123456789"
                  className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
                <button
                  type="button"
                  onClick={verifyAccount}
                  disabled={verifyState === "loading" || !selectedBankCode || accNumber.length !== 10}
                  className="px-4 py-2 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white text-sm font-semibold disabled:opacity-40 flex items-center gap-2 whitespace-nowrap"
                >
                  {verifyState === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Verify
                </button>
              </div>
            </div>

            {/* Verification result */}
            {verifyState === "verified" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-green-700 dark:text-green-300">Verified ✓</p>
                  <p className="text-base font-semibold text-foreground">{verifiedName}</p>
                </div>
              </div>
            )}
            {verifyState === "error" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 dark:text-red-400">{verifyError}</p>
              </div>
            )}

            {/* PIN confirmation */}
            {verifyState === "verified" && (
              <PinField value={bankPin} onChange={setBankPin} label="Enter your PIN to confirm" />
            )}

            <button
              onClick={handleSaveBank}
              disabled={savingBank || verifyState !== "verified" || bankPin.length !== 4}
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {savingBank ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Update Bank Account"}
            </button>
          </div>
        )}

        {/* ── PIN Tab ── */}
        {activeTab === "pin" && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <h2 className="font-bold text-foreground">
                {hasPin ? "Change Withdrawal PIN" : "Set Withdrawal PIN"}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Your 4-digit PIN is required to authorise every withdrawal.
              </p>
            </div>

            {!hasPin && (
              <div className="p-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  You haven't set a PIN yet. Set one to enable withdrawals.
                </p>
              </div>
            )}

            {hasPin && (
              <PinField value={currentPin} onChange={setCurrentPin} label="Current PIN" />
            )}

            <PinField value={newPin} onChange={setNewPin} label="New PIN" />
            <PinField value={confirmPin} onChange={setConfirmPin} label="Confirm New PIN" />

            {newPin.length === 4 && confirmPin.length === 4 && newPin !== confirmPin && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />PINs do not match
              </p>
            )}

            <button
              onClick={handleSavePin}
              disabled={
                savingPin ||
                newPin.length !== 4 ||
                confirmPin.length !== 4 ||
                newPin !== confirmPin ||
                (hasPin && currentPin.length !== 4)
              }
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {savingPin ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Saving...</>
              ) : hasPin ? "Change PIN" : "Set PIN"}
            </button>

            <p className="text-xs text-center text-muted-foreground">
              Never share your PIN with anyone. Vendo staff will never ask for it.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
