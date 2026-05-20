"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { toggleSupplierStatus } from "@/app/actions/admin";

interface Supplier {
  id: string;
  businessName: string;
  phone: string;
  state: string | null;
  supplierType: string;
  kycStatus: string;
  isActive: boolean;
  createdAt: string;
  user: { name: string; email: string };
  productCount: number;
}

const KYC_BADGE: Record<string, string> = {
  PENDING:  "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
  APPROVED: "bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300",
  REJECTED: "bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300",
};

export default function SuppliersClient({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [toggling, setToggling] = useState<string | null>(null);

  const filteredSuppliers = suppliers.filter((s) => {
    if (filter === "all") return true;
    if (filter === "active") return s.isActive;
    if (filter === "inactive") return !s.isActive;
    return s.kycStatus === filter;
  });

  const handleToggleStatus = async (supplierId: string) => {
    setToggling(supplierId);
    const result = await toggleSupplierStatus(supplierId);
    if (result.success) {
      toast.success("Status Updated", { description: result.message });
      router.refresh();
    } else {
      toast.error("Failed to update status", { description: result.error });
    }
    setToggling(null);
  };

  const FILTERS = [
    { key: "all",      label: `All (${suppliers.length})` },
    { key: "active",   label: `Active (${suppliers.filter((s) => s.isActive).length})` },
    { key: "inactive", label: `Inactive (${suppliers.filter((s) => !s.isActive).length})` },
    { key: "PENDING",  label: `Pending KYC (${suppliers.filter((s) => s.kycStatus === "PENDING").length})` },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Suppliers</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage all suppliers on the platform</p>
            </div>
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No suppliers found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    {["Business", "Contact", "Type", "KYC Status", "Products", "Status", "Actions"].map((h) => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-medium text-foreground">{supplier.businessName}</p>
                        <p className="text-sm text-muted-foreground">{supplier.user.name}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-foreground">{supplier.user.email}</p>
                        <p className="text-xs text-muted-foreground">{supplier.phone}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">
                          {supplier.supplierType === "LOCAL" ? "Local" : "Dropship"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${KYC_BADGE[supplier.kycStatus] ?? KYC_BADGE.PENDING}`}>
                          {supplier.kycStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">{supplier.productCount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          supplier.isActive
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {supplier.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(supplier.id)}
                          disabled={toggling === supplier.id}
                          className="text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
                        >
                          {toggling === supplier.id ? "..." : supplier.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
