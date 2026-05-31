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
  pickupAddress?: string | null;
  pickupCity?: string | null;
  pickupState?: string | null;
  pickupPostCode?: string | null;
  pickupPhone?: string | null;
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
  pickupAddress, pickupCity, pickupState, pickupPostCode, pickupPhone,
}: SettingsClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  // ── Profile state ──
  const [profileForm, setProfileForm] = useState({
    businessName,
    phone,
    state: state ?? "",
    bio: bio ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // ── Pickup address state ──
  const [pickupForm, setPickupForm] = useState({
    pickupAddress:  pickupAddress  ?? "",
    pickupCity:     pickupCity     ?? "",
    pickupState:    pickupState    ?? "",
    pickupPostCode: pickupPostCode ?? "",
    pickupPhone:    pickupPhone    ?? "",
  });
  const [savingPickup, setSavingPickup] = useState(false);

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
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  // ── OTP state (for PIN change) ──
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0); // seconds remaining

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

  const handleSavePickup = async () => {
    setSavingPickup(true);
    try {
      const res = await fetch("/api/supplier/settings/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pickupForm),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to save pickup address"); return; }
      toast.success("Pickup address saved");
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setSavingPickup(false); }
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
    // Changing existing PIN requires OTP
    if (hasPin && otpCode.length !== 6) { toast.error("Enter the 6-digit code sent to your email"); return; }
    setSavingPin(true);
    try {
      const res = await fetch("/api/supplier/settings/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          otp:        hasPin ? otpCode : undefined,
          pin:        newPin,
          confirmPin,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.message || "Failed to update PIN"); return; }
      toast.success(data.message);
      setNewPin(""); setConfirmPin(""); setOtpCode(""); setOtpSent(false);
      router.refresh();
    } catch { toast.error("Network error"); }
    finally { setSavingPin(false); }
  };

  const handleSendOtp = async () => {
    setSendingOtp(true);
    try {
      const res = await fetch("/api/supplier/settings/pin/request-otp", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Failed to send code");
        return;
      }
      setOtpSent(true);
      setMaskedEmail(data.maskedEmail ?? "your email");
      toast.success("Code sent", { description: `Check ${data.maskedEmail}` });
      // Start 60-second cooldown
      setOtpCooldown(60);
      const interval = setInterval(() => {
        setOtpCooldown((s) => {
          if (s <= 1) { clearInterval(interval); return 0; }
          return s - 1;
        });
      }, 1000);
    } catch { toast.error("Network error"); }
    finally { setSendingOtp(false); }
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

        {/* ── Pickup Address Card (shown in profile tab) ── */}
        {activeTab === "profile" && (
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div>
              <h2 className="font-bold text-foreground">Pickup Address</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Where Sendbox couriers will collect your orders. Required for Platform Logistics products.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">Street Address</label>
              <input
                value={pickupForm.pickupAddress}
                onChange={(e) => setPickupForm((p) => ({ ...p, pickupAddress: e.target.value }))}
                placeholder="e.g. 12 Onitsha Main Market Road"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">City</label>
                <input
                  value={pickupForm.pickupCity}
                  onChange={(e) => setPickupForm((p) => ({ ...p, pickupCity: e.target.value }))}
                  placeholder="e.g. Onitsha"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">State</label>
                <input
                  value={pickupForm.pickupState}
                  onChange={(e) => setPickupForm((p) => ({ ...p, pickupState: e.target.value }))}
                  placeholder="e.g. Anambra"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Postal Code</label>
                <input
                  value={pickupForm.pickupPostCode}
                  onChange={(e) => setPickupForm((p) => ({ ...p, pickupPostCode: e.target.value }))}
                  placeholder="e.g. 434101"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">Pickup Phone</label>
                <input
                  type="tel"
                  value={pickupForm.pickupPhone}
                  onChange={(e) => setPickupForm((p) => ({ ...p, pickupPhone: e.target.value }))}
                  placeholder="e.g. 08012345678"
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>
            </div>

            <button
              onClick={handleSavePickup}
              disabled={savingPickup}
              className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {savingPickup ? <><Loader2 className="w-4 h-4 animate-spin" />Saving...</> : "Save Pickup Address"}
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
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-900 dark:text-amber-200">
                  You haven't set a PIN yet. Set one to enable withdrawals.
                </p>
              </div>
            )}

            {/* OTP step — only shown when changing an existing PIN */}
            {hasPin && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                    Email verification required
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    {otpSent
                      ? `A 6-digit code was sent to ${maskedEmail}. Enter it below.`
                      : "We'll send a one-time code to your registered email to verify it's you."}
                  </p>
                </div>

                {!otpSent ? (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    disabled={sendingOtp}
                    className="w-full py-3 rounded-xl border-2 border-brand-orange text-brand-orange font-semibold text-sm hover:bg-brand-orange/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {sendingOtp ? <><Loader2 className="w-4 h-4 animate-spin" />Sending…</> : "📧 Send Verification Code"}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">
                      6-Digit Verification Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="flex-1 px-4 py-3 rounded-xl border border-input bg-background text-foreground text-center text-xl tracking-[0.4em] font-bold focus:outline-none focus:ring-2 focus:ring-brand-orange"
                      />
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || otpCooldown > 0}
                        className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-40 whitespace-nowrap"
                      >
                        {otpCooldown > 0 ? `Resend (${otpCooldown}s)` : "Resend"}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Code expires in 10 minutes.</p>
                  </div>
                )}
              </div>
            )}

            {/* New PIN fields — shown always (for set) or after OTP sent (for change) */}
            {(!hasPin || otpSent) && (
              <>
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
                    (hasPin && otpCode.length !== 6)
                  }
                  className="w-full py-3 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {savingPin ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Saving…</>
                  ) : hasPin ? "Change PIN" : "Set PIN"}
                </button>
              </>
            )}

            <p className="text-xs text-center text-muted-foreground">
              Never share your PIN with anyone. Vendo staff will never ask for it.
            </p>
          </div>
        )}

      </main>
    </div>
  );
}
