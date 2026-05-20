"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { logout } from "@/app/actions/auth";


interface Stats {
  totalSuppliers: number;
  activeSuppliers: number;
  pendingKYC: number;
  totalOrders: number;
  pendingOrders: number;
  totalProducts: number;
  pendingProducts: number;
  totalRevenue: number;
}

export default function AdminDashboardClient({ stats }: { stats: Stats }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // logout() calls redirect(), which will throw
      // If we reach here, something went wrong
    } catch (error) {
      // Re-throw redirect errors - they should not be caught
      if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
        throw error
      }
      // Only handle other unexpected errors
      console.error('Logout error:', error);
      toast.error("Failed to logout");
      setIsLoggingOut(false);
    }
  };

  const statCards = [
    {
      title: "Total Suppliers",
      value: stats.totalSuppliers,
      subtitle: `${stats.activeSuppliers} active`,
      icon: "👥",
      color: "blue",
      link: "/admin/suppliers",
    },
    {
      title: "Pending KYC",
      value: stats.pendingKYC,
      subtitle: "Awaiting verification",
      icon: "📋",
      color: "yellow",
      link: "/admin/kyc",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders,
      subtitle: `${stats.pendingOrders} pending`,
      icon: "🛒",
      color: "purple",
      link: "/admin/orders",
    },
    {
      title: "Total Products",
      value: stats.totalProducts,
      subtitle: `${stats.pendingProducts} pending approval`,
      icon: "📦",
      color: "green",
      link: "/admin/products",
    },
    {
      title: "Total Revenue",
      value: `₦${stats.totalRevenue.toLocaleString()}`,
      subtitle: "All time",
      icon: "💰",
      color: "orange",
      link: "/admin/reports",
    },
  ];

  const quickActions = [
    {
      title: "Verify KYC",
      description: "Review pending supplier verifications",
      icon: "✓",
      link: "/admin/kyc",
      color: "blue",
    },
    {
      title: "Manage Suppliers",
      description: "View and manage all suppliers",
      icon: "👥",
      link: "/admin/suppliers",
      color: "purple",
    },
    {
      title: "View Orders",
      description: "Monitor all platform orders",
      icon: "📦",
      link: "/admin/orders",
      color: "green",
    },
    {
      title: "Approve Products",
      description: "Review pending product listings",
      icon: "✓",
      link: "/admin/products",
      color: "orange",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Vendo Platform Management</p>
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {statCards.map((stat) => (
            <button
              key={stat.title}
              onClick={() => router.push(stat.link)}
              className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow text-left"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{stat.icon}</span>
                <span
                  className={`text-xs font-semibold px-2 py-1 rounded-full bg-${stat.color}-100 text-${stat.color}-700 dark:bg-${stat.color}-900/30 dark:text-${stat.color}-300`}
                >
                  View
                </span>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</h3>
              <p className="text-2xl font-bold text-foreground mb-1">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </button>
          ))}
        </div>

        {/* Alerts */}
        {stats.pendingKYC > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-900 text-lg mb-2">
                  {stats.pendingKYC} New Supplier{stats.pendingKYC > 1 ? "s" : ""} Awaiting Verification
                </h3>
                <p className="text-sm text-yellow-800 mb-3">
                  Review their onboarding information, business details, and KYC documents before approving.
                </p>
                <button
                  onClick={() => router.push("/admin/kyc")}
                  className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm"
                >
                  Review Suppliers Now →
                </button>
              </div>
            </div>
          </div>
        )}

        {stats.pendingProducts > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📦</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  {stats.pendingProducts} Product{stats.pendingProducts > 1 ? "s" : ""} Awaiting
                  Approval
                </h3>
                <p className="text-sm text-blue-700 mb-3">
                  New products need to be reviewed before going live.
                </p>
                <button
                  onClick={() => router.push("/admin/products")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Review Products →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div>
          <h2 className="text-xl font-bold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.title}
                onClick={() => router.push(action.link)}
                className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow text-left"
              >
                <div
                  className={`w-12 h-12 rounded-lg bg-${action.color}-100 dark:bg-${action.color}-900/30 flex items-center justify-center text-2xl mb-4`}
                >
                  {action.icon}
                </div>
                <h3 className="font-semibold text-foreground mb-1">{action.title}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Management</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Suppliers", link: "/admin/suppliers", icon: "👥" },
              { label: "KYC Verification", link: "/admin/kyc", icon: "📋" },
              { label: "Orders", link: "/admin/orders", icon: "🛒" },
              { label: "Products", link: "/admin/products", icon: "📦" },
              { label: "Customers", link: "/admin/customers", icon: "👤" },
              { label: "Reports", link: "/admin/reports", icon: "📊" },
              { label: "Settings", link: "/admin/settings", icon: "⚙️" },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => router.push(item.link)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
              >
                <span className="text-2xl">{item.icon}</span>
                <span className="font-medium text-foreground">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
