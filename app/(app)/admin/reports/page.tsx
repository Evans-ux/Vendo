import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import ReportsClient from "./ReportsClient";

export const metadata = {
  title: "Admin Reports & Analytics | Vendo",
};

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (dbUser?.role !== "ADMIN") redirect("/");

  // 1. Fetch KPI Aggregates
  const totalOrders = await prisma.order.count();
  const activeSuppliers = await prisma.supplier.count({ where: { isActive: true } });
  const productsListed = await prisma.product.count({ where: { isActive: true } });
  
  const allOrders = await prisma.order.findMany({
    where: { paymentStatus: "PAID" },
    select: { totalAmount: true, createdAt: true }
  });

  const totalRevenue = allOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

  // 2. Generate Real-Time Monthly Revenue (Last 6 Months)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const revMap: Record<string, number> = {};
  
  // Initialize last 6 months with 0
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    revMap[`${monthNames[d.getMonth()]} ${d.getFullYear()}`] = 0;
  }

  allOrders.forEach(order => {
    const date = new Date(order.createdAt);
    const key = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
    if (revMap[key] !== undefined) {
      revMap[key] += Number(order.totalAmount);
    }
  });

  const revenueData = Object.entries(revMap).map(([month, value]) => ({ month, value }));

  // 3. Top Products (Ranked by how many times they appear in OrderItem)
  const topProductsRaw = await prisma.product.findMany({
    take: 5,
    include: {
      _count: {
        select: { orderItems: true }
      }
    },
    orderBy: {
      orderItems: { _count: 'desc' }
    }
  });

  const topProducts = topProductsRaw.map(p => ({
    name: p.name,
    sales: p._count.orderItems,
    revenue: Number(p.sellingPrice) * p._count.orderItems
  }));

  // 4. Supplier Performance
  const topSuppliersRaw = await prisma.supplier.findMany({
    take: 4,
    where: { isActive: true },
    select: {
      businessName: true,
      totalEarned: true,
      products: {
        select: { _count: { select: { orderItems: true } } }
      }
    },
    orderBy: { totalEarned: "desc" }
  });

  const supplierPerformance = topSuppliersRaw.map(s => {
    const totalSales = s.products.reduce((acc, p) => acc + p._count.orderItems, 0);
    return {
      name: s.businessName,
      score: Math.min(100, 80 + (totalSales * 2)), // Rough calc
      orders: totalSales,
      totalEarned: Number(s.totalEarned)
    };
  });

  return (
    <ReportsClient 
      kpis={{ totalRevenue, totalOrders, activeSuppliers, productsListed }}
      revenueData={revenueData}
      topProducts={topProducts}
      supplierPerformance={supplierPerformance}
    />
  );
}
