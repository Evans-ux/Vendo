"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, RefreshCw } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string | null;
  basePrice: number;
  sellingPrice: number;
  imageUrls: string[];
  stock: number;
  isApproved: boolean;
  isActive: boolean;
}

interface Supplier {
  id: string;
  businessName: string;
  phone: string;
  state: string | null;
  supplierType: string;
  kycStatus: string;
  kycRejectionReason: string | null;
  onboardingStep: string;
  isActive: boolean;
  bio: string | null;
  termsAcceptedAt: string | null;
  createdAt: string;
  products: Product[];
}

interface DashboardClientProps {
  supplier: Supplier;
  productCount: number;
  walletBalance: number;
  pendingBalance: number;
  totalEarned: number;
  hasPin: boolean;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    customerName: string;
    customerPhone: string;
    createdAt: string;
    items: Array<{ name: string; image: string | null; quantity: number }>;
  }>;
}

const KYC_STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-400 border-amber-400/50 dark:border-yellow-500/30",
  APPROVED: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30",
};

const KYC_STATUS_LABELS: Record<string, string> = {
  PENDING:  "Under Review",
  APPROVED: "Verified",
  REJECTED: "Action Required",
};

// ─── KYC Rejection Modal ──────────────────────────────────────────────────────

function KycRejectionModal({
  reason,
  businessName,
  onDismiss,
  onResubmit,
}: {
  reason: string;
  businessName: string;
  onDismiss: () => void;
  onResubmit: () => void;
}) {
  useEffect(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = "sine";
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, startTime + duration);
        osc.start(startTime);
        osc.stop(startTime + duration);
      };
      playTone(330, ctx.currentTime, 0.18);
      playTone(220, ctx.currentTime + 0.22, 0.28);
    } catch {
      // AudioContext unavailable — silent fallback
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
      <div className="relative bg-card border border-red-500/30 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Red header */}
        <div className="bg-red-500 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">KYC Verification Failed</p>
              <p className="text-white/80 text-xs">{businessName}</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our team reviewed your documents and could not verify your account. Here's the reason:
          </p>
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">
              Rejection Reason
            </p>
            <p className="text-sm text-foreground leading-relaxed font-medium">{reason}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please address the issue above and resubmit your documents. Your account will be reviewed again within 24–48 hours.
          </p>
        </div>
        {/* Actions */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            Dismiss
          </button>
          <button
            onClick={onResubmit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Re-submit Documents
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardClient({
  supplier,
  productCount,
  walletBalance,
  pendingBalance,
  totalEarned,
  hasPin,
  recentOrders,
}: DashboardClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const sessionKey = `kyc_rejection_seen_${supplier.id}`;
  const [showRejectionModal, setShowRejectionModal] = useState(false);

  useEffect(() => {
    if (
      supplier.kycStatus === "REJECTED" &&
      supplier.kycRejectionReason &&
      typeof window !== "undefined" &&
      !sessionStorage.getItem(sessionKey)
    ) {
      const t = setTimeout(() => setShowRejectionModal(true), 400);
      return () => clearTimeout(t);
    }
  }, [supplier.kycStatus, supplier.kycRejectionReason, sessionKey]);

  const dismissModal = () => {
    sessionStorage.setItem(sessionKey, "1");
    setShowRejectionModal(false);
  };

  const handleResubmit = () => {
    sessionStorage.setItem(sessionKey, "1");
    setShowRejectionModal(false);
    router.push("/supplier/onboard/kyc/resubmit");
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
      console.error("Logout error:", error);
      toast.error("Failed to logout");
      setIsLoggingOut(false);
    }
  };

  const kycStyle = KYC_STATUS_STYLES[supplier.kycStatus] ?? KYC_STATUS_STYLES.PENDING;
  const kycLabel = KYC_STATUS_LABELS[supplier.kycStatus] ?? supplier.kycStatus;

  return (
    <div className="min-h-screen bg-background">

      {/* ── KYC Rejection Modal ── */}
      {showRejectionModal && supplier.kycRejectionReason && (
        <KycRejectionModal
          reason={supplier.kycRejectionReason}
          businessName={supplier.businessName}
          onDismiss={dismissModal}
          onResubmit={handleResubmit}
        />
      )}

      {/* ── Header ── */}
      <header className="border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Vendo</h1>
              <p className="text-xs text-muted-foreground">Supplier Portal</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button variant="ghost" onClick={handleLogout} disabled={isLoggingOut}>
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

        {/* ── Welcome ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">{supplier.businessName}</h2>
            <p className="text-muted-foreground mt-1">
              {supplier.supplierType === "LOCAL"
                ? "Local Supplier · 2–3 day delivery"
                : "Dropship Supplier · 14–21 day delivery"}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${kycStyle}`}>
            {kycLabel}
          </span>
        </div>

        {/* ── Account suspended banner ── */}
        {!supplier.isActive && supplier.kycStatus === "APPROVED" && (
          <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xl">🚫</span>
            </div>
            <div className="flex-1">
              <p className="text-base font-bold text-red-600 dark:text-red-400 mb-1">
                Account Suspended
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-300/80 leading-relaxed">
                Your supplier account has been suspended by the Vendo admin team. Your products are hidden from customers and you cannot upload new products or process withdrawals.
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-300/80 mt-2">
                To appeal or get more information, contact{" "}
                <a href="mailto:support@vendo.ng" className="font-semibold underline underline-offset-2">
                  support@vendo.ng
                </a>
              </p>
            </div>
          </div>
        )}

        {/* ── KYC rejection inline banner ── */}
        {supplier.kycStatus === "REJECTED" && supplier.kycRejectionReason && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">
                KYC Rejected — Action Required
              </p>
              <p className="text-sm text-red-600/80 dark:text-red-300/80 leading-relaxed">
                {supplier.kycRejectionReason}
              </p>
              <button
                onClick={() => router.push("/supplier/onboard/kyc/resubmit")}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400 hover:underline underline-offset-2"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Re-submit documents →
              </button>
            </div>
          </div>
        )}

        {/* ── Pending KYC notice ── */}
        {supplier.kycStatus === "PENDING" && (
          <div className="rounded-xl border border-amber-300 dark:border-yellow-500/30 bg-amber-50 dark:bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-amber-900 dark:text-yellow-400 mb-1">
              Verification in Progress
            </p>
            <p className="text-sm text-amber-800 dark:text-yellow-300/80">
              Your KYC documents are being reviewed. This usually takes 24–48 hours. Your products
              will go live once approved.
            </p>
          </div>
        )}

        {/* ── Stats ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Products Listed",   value: productCount,                      icon: "📦", onClick: () => router.push("/supplier/products") },
            { label: "Total Orders",      value: 0,                                 icon: "🛒", onClick: () => router.push("/supplier/orders") },
            { label: "Total Earned (₦)",  value: `₦${totalEarned.toLocaleString()}`, icon: "💰", onClick: () => router.push("/supplier/wallet") },
            { label: "Available Balance", value: `₦${walletBalance.toLocaleString()}`, icon: "🏦", onClick: () => router.push("/supplier/wallet"), highlight: true },
          ].map((stat) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className={`rounded-2xl border p-6 flex items-center gap-4 shadow-sm hover:shadow-md transition-all text-left ${
                (stat as any).highlight
                  ? "bg-brand-orange border-brand-orange/30 text-white"
                  : "bg-card border-border hover:bg-accent/20"
              }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
                (stat as any).highlight ? "bg-white/20" : "bg-primary/10"
              }`}>
                {stat.icon}
              </div>
              <div>
                <p className={`text-2xl font-bold ${(stat as any).highlight ? "text-white" : "text-foreground"}`}>
                  {stat.value}
                </p>
                <p className={`text-sm ${(stat as any).highlight ? "text-white/80" : "text-muted-foreground"}`}>
                  {stat.label}
                </p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Pending balance notice ── */}
        {pendingBalance > 0 && (
          <div className="rounded-xl border border-amber-300 dark:border-yellow-500/30 bg-amber-50 dark:bg-yellow-500/10 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-900 dark:text-yellow-400">
                ₦{pendingBalance.toLocaleString()} pending
              </p>
              <p className="text-xs text-amber-700 dark:text-yellow-300/80 mt-0.5">
                Awaiting 24hr dispute window after delivery confirmation
              </p>
            </div>
            <button
              onClick={() => router.push("/supplier/wallet")}
              className="text-sm font-semibold text-amber-900 dark:text-yellow-400 hover:underline whitespace-nowrap ml-4"
            >
              View →
            </button>
          </div>
        )}

        {/* ── PIN setup prompt ── */}
        {!hasPin && (
          <div className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-brand-orange">Set your withdrawal PIN</p>
              <p className="text-xs text-muted-foreground mt-0.5">Required to withdraw your earnings</p>
            </div>
            <button
              onClick={() => router.push("/supplier/settings")}
              className="text-sm font-semibold text-brand-orange hover:underline whitespace-nowrap ml-4"
            >
              Set PIN →
            </button>
          </div>
        )}

        {/* ── Recent Orders ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
            <button
              onClick={() => router.push("/supplier/orders")}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              View all →
            </button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-sm font-semibold text-foreground mb-1">No orders yet</p>
              <p className="text-xs text-muted-foreground">Orders from customers will appear here once paid</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => {
                const statusColors: Record<string, string> = {
                  PENDING:   "bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-400",
                  CONFIRMED: "bg-blue-100 dark:bg-blue-500/10 text-blue-800 dark:text-blue-400",
                  SHIPPED:   "bg-indigo-100 dark:bg-indigo-500/10 text-indigo-800 dark:text-indigo-400",
                  DELIVERED: "bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400",
                  CANCELLED: "bg-red-100 dark:bg-red-500/10 text-red-800 dark:text-red-400",
                };
                const statusColor = statusColors[order.status] ?? "bg-muted text-muted-foreground";
                return (
                  <div key={order.id} className="flex items-center gap-4 p-3 rounded-xl border border-border bg-background hover:bg-accent/20 transition-colors">
                    {order.items[0]?.image ? (
                      <img src={order.items[0].image} alt={order.items[0].name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {order.items.map(i => i.name).join(", ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        #{order.orderNumber} · {order.customerName}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-brand-orange">₦{order.totalAmount.toLocaleString()}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Products preview ── */}
        {supplier.products.length > 0 && (
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Your Products</h3>
              <button
                onClick={() => router.push("/supplier/products")}
                className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                View all →
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplier.products.slice(0, 6).map((product) => (
                <div key={product.id} className="rounded-xl border border-border bg-background hover:bg-accent/30 transition-colors p-4">
                  {product.imageUrls[0] && (
                    <img src={product.imageUrls[0]} alt={product.name} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <p className="font-medium text-foreground text-sm truncate">{product.name}</p>
                  <p className="text-muted-foreground text-xs mt-1">{product.category ?? "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-primary font-semibold text-sm">₦{product.sellingPrice.toLocaleString()}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      product.isApproved
                        ? "bg-green-100 dark:bg-green-500/10 text-green-800 dark:text-green-400"
                        : "bg-amber-100 dark:bg-yellow-500/10 text-amber-800 dark:text-yellow-400"
                    }`}>
                      {product.isApproved ? "Live" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Business Info ── */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-foreground mb-6">Business Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: "Business Name",  value: supplier.businessName },
              { label: "Phone",          value: supplier.phone },
              { label: "State",          value: supplier.state ?? "—" },
              { label: "Supplier Type",  value: supplier.supplierType === "LOCAL" ? "Local" : "Dropship" },
              { label: "Member Since",   value: new Date(supplier.createdAt).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" }) },
              { label: "Account Status", value: supplier.isActive ? "Active" : "Pending Approval" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                <p className="text-foreground font-medium">{item.value}</p>
              </div>
            ))}
          </div>
          {supplier.bio && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Store Description</p>
              <p className="text-muted-foreground text-sm leading-relaxed">{supplier.bio}</p>
            </div>
          )}
        </div>

        {/* ── Quick Actions ── */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <button onClick={() => router.push("/supplier/products")} className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm">
              📦 Manage Products
            </button>
            <button onClick={() => router.push("/supplier/orders")} className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm">
              📋 View Orders
            </button>
            <button onClick={() => router.push("/supplier/wallet")} className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-colors whitespace-nowrap shadow-sm">
              💰 Wallet & Payouts
            </button>
            <button onClick={() => router.push("/supplier/products/add")} className="px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-accent transition-colors text-sm font-medium whitespace-nowrap">
              + Add Product
            </button>
            <button onClick={() => router.push("/supplier/settings")} className="px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-accent transition-colors text-sm font-medium whitespace-nowrap">
              ⚙️ Settings
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}
