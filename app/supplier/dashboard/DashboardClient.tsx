"use client";

import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { toast } from "sonner";

interface Supplier {
  id: string;
  full_name: string;
  business_name: string;
  email: string;
  phone: string;
  created_at: string;
}

interface DashboardClientProps {
  supplier: Supplier;
}

export default function DashboardClient({ supplier }: DashboardClientProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success("Logged out successfully");
    } catch {
      toast.error("Failed to logout");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Vendo</h1>
              <p className="text-sm text-gray-400">Supplier Dashboard</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Welcome back, {supplier.full_name || supplier.business_name}!
          </h2>
          <p className="text-gray-400">Manage your supplier account and business information</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {[
            { label: "Total Products", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
            { label: "Total Orders", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
            { label: "Revenue", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
          ].map((stat) => (
            <div key={stat.label} className="bg-gray-800 rounded-2xl border border-gray-700 p-6 hover:border-orange-500 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">0</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Business Info */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8">
          <h3 className="text-xl font-bold text-white mb-6">Business Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { label: "Business Name", value: supplier.business_name },
              { label: "Full Name", value: supplier.full_name || "—" },
              { label: "Email", value: supplier.email },
              { label: "Phone", value: supplier.phone },
              { label: "Member Since", value: new Date(supplier.created_at).toLocaleDateString() },
            ].map((item) => (
              <div key={item.label}>
                <label className="block text-sm font-medium text-gray-400 mb-1">{item.label}</label>
                <p className="text-white text-lg">{item.value}</p>
              </div>
            ))}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Account Status</label>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-500/10 text-green-500">
                Active
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
