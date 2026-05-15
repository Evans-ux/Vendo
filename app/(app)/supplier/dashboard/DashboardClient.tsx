"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/ThemeToggle";

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
}

const KYC_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
  APPROVED: "bg-green-500/10 text-green-400 border-green-500/30",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/30",
};

const KYC_STATUS_LABELS: Record<string, string> = {
  PENDING: "Under Review",
  APPROVED: "Verified",
  REJECTED: "Rejected",
};

export default function DashboardClient({ supplier, productCount }: DashboardClientProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error("Failed to logout");
      setIsLoggingOut(false);
    }
  };

  const kycStyle = KYC_STATUS_STYLES[supplier.kycStatus] ?? KYC_STATUS_STYLES.PENDING;
  const kycLabel = KYC_STATUS_LABELS[supplier.kycStatus] ?? supplier.kycStatus;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-foreground">Vendo</h1>
              <p className="text-xs text-muted-foreground">Supplier Portal</p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-3 py-2 sm:px-4 rounded-lg text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-brand-cream">{supplier.businessName}</h2>
            <p className="text-brand-cream/50 mt-1">
              {supplier.supplierType === "LOCAL"
                ? "Local Supplier · 2–3 day delivery"
                : "Dropship Supplier · 14–21 day delivery"}
            </p>
          </div>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${kycStyle}`}>
            {kycLabel}
          </span>
        </div>

        {/* KYC rejection notice */}
        {supplier.kycStatus === "REJECTED" && supplier.kycRejectionReason && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-400 mb-1">KYC Rejected</p>
            <p className="text-sm text-red-300/80">{supplier.kycRejectionReason}</p>
            <button
              onClick={() => router.push("/supplier/onboard/kyc")}
              className="mt-3 text-sm font-medium text-red-400 hover:text-red-300 underline underline-offset-2"
            >
              Re-submit documents →
            </button>
          </div>
        )}

        {/* Pending notice */}
        {supplier.kycStatus === "PENDING" && (
          <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
            <p className="text-sm font-semibold text-yellow-400 mb-1">Verification in Progress</p>
            <p className="text-sm text-yellow-300/80">
              Your KYC documents are being reviewed. This usually takes 24–48 hours. Your products
              will go live once approved.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Products Listed", value: productCount, icon: "📦" },
            { label: "Total Orders", value: 0, icon: "🛒" },
            { label: "Revenue (₦)", value: "0.00", icon: "💰" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 flex items-center gap-4"
            >
              <span className="text-3xl">{stat.icon}</span>
              <div>
                <p className="text-2xl font-bold text-brand-cream">{stat.value}</p>
                <p className="text-sm text-brand-cream/50">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Products preview */}
        {supplier.products.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-brand-cream mb-4">Your Products</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {supplier.products.slice(0, 6).map((product) => (
                <div key={product.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  {product.imageUrls[0] && (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded-lg mb-3"
                    />
                  )}
                  <p className="font-medium text-brand-cream text-sm truncate">{product.name}</p>
                  <p className="text-brand-cream/50 text-xs mt-1">{product.category ?? "—"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-brand-orange font-semibold text-sm">
                      ₦{product.sellingPrice.toLocaleString()}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        product.isApproved
                          ? "bg-green-500/10 text-green-400"
                          : "bg-yellow-500/10 text-yellow-400"
                      }`}
                    >
                      {product.isApproved ? "Live" : "Pending"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Business Info */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-lg font-semibold text-brand-cream mb-6">Business Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { label: "Business Name", value: supplier.businessName },
              { label: "Phone", value: supplier.phone },
              { label: "State", value: supplier.state ?? "—" },
              { label: "Supplier Type", value: supplier.supplierType === "LOCAL" ? "Local" : "Dropship" },
              {
                label: "Member Since",
                value: new Date(supplier.createdAt).toLocaleDateString("en-NG", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }),
              },
              { label: "Account Status", value: supplier.isActive ? "Active" : "Pending Approval" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs font-medium text-brand-cream/40 uppercase tracking-wider mb-1">
                  {item.label}
                </p>
                <p className="text-brand-cream font-medium">{item.value}</p>
              </div>
            ))}
          </div>
          {supplier.bio && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-xs font-medium text-brand-cream/40 uppercase tracking-wider mb-2">
                Store Description
              </p>
              <p className="text-brand-cream/70 text-sm leading-relaxed">{supplier.bio}</p>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3">
            <button
              onClick={() => router.push("/supplier/products")}
              className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors whitespace-nowrap"
            >
              📦 Manage Products
            </button>
            <button
              onClick={() => router.push("/supplier/orders")}
              className="px-4 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold transition-colors whitespace-nowrap"
            >
              📋 View Orders
            </button>
            <button
              onClick={() => router.push("/supplier/onboard/products")}
              className="px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted/50 text-sm font-medium transition-colors whitespace-nowrap"
            >
              + Add Product
            </button>
            <button
              onClick={() => router.push("/supplier/onboard")}
              className="px-4 py-2.5 rounded-lg border border-border text-foreground hover:bg-muted/50 text-sm font-medium transition-colors whitespace-nowrap"
            >
              ⚙️ Edit Profile
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
