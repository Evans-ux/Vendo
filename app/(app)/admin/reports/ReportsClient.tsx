"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, DollarSign, Package, Users, ShoppingCart } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";

interface KPI {
  totalRevenue: number;
  totalOrders: number;
  activeSuppliers: number;
  productsListed: number;
}

interface RevenuePoint {
  month: string;
  value: number;
}

interface ProductPoint {
  name: string;
  sales: number;
  revenue: number;
}

interface SupplierPoint {
  name: string;
  score: number;
  orders: number;
  totalEarned: number;
}

interface ReportsProps {
  kpis: KPI;
  revenueData: RevenuePoint[];
  topProducts: ProductPoint[];
  supplierPerformance: SupplierPoint[];
}

export default function ReportsClient({
  kpis,
  revenueData,
  topProducts,
  supplierPerformance
}: ReportsProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/dashboard")}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Reports & Analytics (Live)</h1>
              <p className="text-sm text-muted-foreground mt-1">Real-time database performance metrics</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Total Revenue", value: `₦${kpis.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
            { title: "Total Orders", value: kpis.totalOrders.toLocaleString(), icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "Active Suppliers", value: kpis.activeSuppliers.toLocaleString(), icon: Users, color: "text-purple-500", bg: "bg-purple-500/10" },
            { title: "Products Listed", value: kpis.productsListed.toLocaleString(), icon: Package, color: "text-orange-500", bg: "bg-orange-500/10" },
          ].map((kpi) => (
            <div key={kpi.title} className="bg-card rounded-xl border border-border p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`w-6 h-6 ${kpi.color}`} />
                </div>
                <div className="text-green-500 flex items-center gap-1 text-sm font-medium">
                  <TrendingUp className="w-4 h-4" /> Live
                </div>
              </div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">{kpi.title}</h3>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue Chart Section using Recharts */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-foreground">Revenue Overview</h2>
            <p className="text-sm text-muted-foreground">Monthly gross platform revenue (₦)</p>
          </div>
          
          <div className="h-80 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value: any) => `₦${Number(value).toLocaleString()}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "hsl(var(--popover))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold", marginBottom: "4px" }}
                  formatter={(value: any) => [`₦${Number(value).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="value" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Top Products */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Top Performing Products</h2>
              <p className="text-sm text-muted-foreground">Live data from top sold items</p>
            </div>
            
            {topProducts.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">No orders yet</div>
            ) : (
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical" margin={{ top: 0, right: 0, left: 30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} 
                      contentStyle={{ backgroundColor: "hsl(var(--popover))", borderRadius: "8px", borderColor: "hsl(var(--border))" }} 
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                    />
                    <Bar dataKey="sales" name="Units Sold" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Supplier Performance */}
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-foreground">Supplier Performance Watch</h2>
              <p className="text-sm text-muted-foreground">Live supplier ranking and fulfillment score</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 rounded-lg">
                  <tr>
                    <th className="px-4 py-3 rounded-tl-lg rounded-bl-lg font-medium">Supplier</th>
                    <th className="px-4 py-3 font-medium text-center">Score</th>
                    <th className="px-4 py-3 font-medium text-right">Orders</th>
                    <th className="px-4 py-3 rounded-tr-lg rounded-br-lg font-medium text-right">Earned</th>
                  </tr>
                </thead>
                <tbody>
                  {supplierPerformance.length === 0 ? (
                    <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No suppliers live yet</td></tr>
                  ) : (
                    supplierPerformance.map((supplier) => (
                      <tr key={supplier.name} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-4 font-medium text-foreground truncate max-w-[120px]">{supplier.name}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-md border text-[10px] uppercase tracking-wider font-bold ${
                            supplier.score >= 90 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-400/10 dark:text-emerald-400 dark:border-emerald-400/20' :
                            supplier.score >= 80 ? 'bg-orange-50 text-orange-800 border-orange-100 dark:bg-orange-400/10 dark:text-orange-400 dark:border-orange-400/20' :
                            'bg-red-50 text-red-700 border-red-100 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20'
                          }`}>
                            {supplier.score}/100
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-muted-foreground">{supplier.orders.toLocaleString()}</td>
                        <td className="px-4 py-4 text-right text-green-600 dark:text-green-400 font-medium">₦{supplier.totalEarned.toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
