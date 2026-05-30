"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Wallet, TrendingUp, Clock, ArrowDownLeft, ArrowUpRight,
  Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, Settings
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string;
  type: string;
  status: string;
  amount: number;
  description: string;
  availableAt: string | null;
  createdAt: string;
}

interface Withdrawal {
  id: string;
  amount: number;
  status: string;
  bankName: string;
  accountNumber: string;
  createdAt: string;
  completedAt: string | null;
}

interface WalletClientProps {
  walletBalance: number;
  totalEarned: number;
  pendingBalance: number;
  hasPin: boolean;
  bankName: string | null;
  accountNumber: string | null;
  accountHolderName: string | null;
  transactions: Transaction[];
  withdrawals: Withdrawal[];
}

// ─── PIN Input ────────────────────────────────────────────────────────────────

function PinInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
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
          placeholder="••••"
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

// ─── Withdraw Modal ───────────────────────────────────────────────────────────

function WithdrawModal({
  available,
  bankName,
  accountNumber,
  onClose,
  onSuccess,
}: {
  available: number;
  bankName: string;
  accountNumber: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const parsedAmount = parseFloat(amount.replace(/,/g, "")) || 0;
  const canSubmit = parsedAmount >= 1000 && parsedAmount <= available && pin.length === 4;

  const handleWithdraw = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const res = await fetch("/api/supplier/wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parsedAmount, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Withdrawal failed");
        return;
      }
      toast.success(data.message);
      onSuccess();
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl border border-border w-full max-w-sm p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground">Withdraw Funds</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        {/* Destination */}
        <div className="p-3 rounded-xl bg-surface border border-border text-sm">
          <p className="text-muted text-xs mb-1">Sending to</p>
          <p className="font-semibold text-foreground">{bankName}</p>
          <p className="text-muted-foreground">•••• •••• {accountNumber.slice(-4)}</p>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">Amount (₦)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold">₦</span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="0"
              className="w-full pl-8 pr-4 py-3 rounded-xl border border-input bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-brand-orange"
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Min: ₦1,000</span>
            <button
              type="button"
              onClick={() => setAmount(String(available))}
              className="text-brand-orange font-semibold hover:underline"
            >
              Max: ₦{available.toLocaleString()}
            </button>
          </div>
        </div>

        {/* PIN */}
        <PinInput value={pin} onChange={setPin} label="Withdrawal PIN" />

        <button
          onClick={handleWithdraw}
          disabled={!canSubmit || loading}
          className="w-full py-3.5 rounded-xl bg-brand-orange hover:bg-brand-orange/90 text-white font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Processing...</>
          ) : (
            <>Withdraw ₦{parsedAmount > 0 ? parsedAmount.toLocaleString() : "0"}</>
          )}
        </button>

        <p className="text-xs text-center text-muted-foreground">
          Transfers usually arrive within 1–3 minutes via Flutterwave
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WalletClient({
  walletBalance,
  totalEarned,
  pendingBalance,
  hasPin,
  bankName,
  accountNumber,
  accountHolderName,
  transactions,
  withdrawals,
}: WalletClientProps) {
  const router = useRouter();
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [activeTab, setActiveTab] = useState<"earnings" | "withdrawals">("earnings");

  const canWithdraw = hasPin && !!bankName && !!accountNumber && walletBalance >= 1000;

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING:    "bg-amber-100 dark:bg-yellow-900/30 text-amber-800 dark:text-yellow-300",
      AVAILABLE:  "bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300",
      WITHDRAWN:  "bg-blue-100   dark:bg-blue-900/30   text-blue-800   dark:text-blue-300",
      PROCESSING: "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300",
      COMPLETED:  "bg-green-100  dark:bg-green-900/30  text-green-800  dark:text-green-300",
      FAILED:     "bg-red-100    dark:bg-red-900/30    text-red-800    dark:text-red-300",
    };
    return map[status] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Wallet</h1>
            <p className="text-xs text-muted-foreground">Your earnings & payouts</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/supplier/settings")}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => router.push("/supplier/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Available */}
          <div className="rounded-2xl bg-brand-orange p-6 text-white shadow-lg shadow-brand-orange/30 sm:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Available Balance</span>
            </div>
            <p className="text-3xl font-bold">₦{walletBalance.toLocaleString()}</p>
            <p className="text-xs opacity-70 mt-1">Ready to withdraw</p>
          </div>

          {/* Pending */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-muted-foreground">Pending</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₦{pendingBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">24hr dispute window</p>
          </div>

          {/* Total Earned */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-muted-foreground">Total Earned</span>
            </div>
            <p className="text-2xl font-bold text-foreground">₦{totalEarned.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </div>
        </div>

        {/* Withdraw CTA */}
        {!hasPin && (
          <div className="rounded-xl border border-amber-300 dark:border-yellow-500/30 bg-amber-50 dark:bg-yellow-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-yellow-300">Set a withdrawal PIN first</p>
              <p className="text-sm text-amber-800 dark:text-yellow-300/80 mt-0.5">
                You need a 4-digit PIN to withdraw funds.{" "}
                <button
                  onClick={() => router.push("/supplier/settings")}
                  className="underline font-semibold"
                >
                  Go to Settings →
                </button>
              </p>
            </div>
          </div>
        )}

        {hasPin && !bankName && (
          <div className="rounded-xl border border-amber-300 dark:border-yellow-500/30 bg-amber-50 dark:bg-yellow-500/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-yellow-300">Bank account not set</p>
              <p className="text-sm text-amber-800 dark:text-yellow-300/80 mt-0.5">
                Add your bank account in{" "}
                <button onClick={() => router.push("/supplier/settings")} className="underline font-semibold">
                  Settings →
                </button>
              </p>
            </div>
          </div>
        )}

        {canWithdraw && (
          <button
            onClick={() => setShowWithdraw(true)}
            className="w-full py-4 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-white font-bold text-lg transition-all shadow-lg shadow-brand-orange/25 hover:scale-[1.01] flex items-center justify-center gap-3"
          >
            <ArrowUpRight className="w-5 h-5" />
            Withdraw Funds
          </button>
        )}

        {/* Bank info */}
        {bankName && accountNumber && (
          <div className="rounded-xl border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted uppercase tracking-wide font-semibold mb-1">Payout Account</p>
              <p className="font-semibold text-foreground">{accountHolderName}</p>
              <p className="text-sm text-muted-foreground">{bankName} · •••• {accountNumber.slice(-4)}</p>
            </div>
            <button
              onClick={() => router.push("/supplier/settings")}
              className="text-sm text-brand-orange hover:underline font-medium"
            >
              Change
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted/30 rounded-xl w-fit">
          {(["earnings", "withdrawals"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${
                activeTab === tab
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Earnings list */}
        {activeTab === "earnings" && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-4xl mb-3">💰</p>
                <p className="font-semibold text-foreground mb-1">No earnings yet</p>
                <p className="text-sm text-muted-foreground">Earnings appear here when customers confirm delivery</p>
              </div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    t.type === "CREDIT" ? "bg-green-500/10" : "bg-red-500/10"
                  }`}>
                    {t.type === "CREDIT"
                      ? <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                      : <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(t.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {t.status === "PENDING" && t.availableAt && (
                      <p className="text-xs text-amber-700 dark:text-yellow-400 mt-0.5">
                        Available {new Date(t.availableAt).toLocaleTimeString("en-NG", {
                          hour: "2-digit", minute: "2-digit",
                        })} · {new Date(t.availableAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold ${t.type === "CREDIT" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {t.type === "CREDIT" ? "+" : "-"}₦{t.amount.toLocaleString()}
                    </p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Withdrawals list */}
        {activeTab === "withdrawals" && (
          <div className="space-y-2">
            {withdrawals.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-12 text-center">
                <p className="text-4xl mb-3">🏦</p>
                <p className="font-semibold text-foreground mb-1">No withdrawals yet</p>
                <p className="text-sm text-muted-foreground">Your withdrawal history will appear here</p>
              </div>
            ) : (
              withdrawals.map((w) => (
                <div key={w.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <ArrowUpRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {w.bankName} · •••• {w.accountNumber.slice(-4)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(w.createdAt).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {w.completedAt && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-0.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Completed {new Date(w.completedAt).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-foreground">₦{w.amount.toLocaleString()}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge(w.status)}`}>
                      {w.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </main>

      {/* Withdraw Modal */}
      {showWithdraw && bankName && accountNumber && (
        <WithdrawModal
          available={walletBalance}
          bankName={bankName}
          accountNumber={accountNumber}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => {
            setShowWithdraw(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
