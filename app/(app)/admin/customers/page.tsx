import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import CustomersClient from "./CustomersClient";

export const metadata = {
  title: "Customers | Admin Dashboard",
};

export default async function AdminCustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (dbUser?.role !== "ADMIN") {
    redirect("/");
  }

  // Fetch all platform users
  const customers = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      orders: {
        select: { id: true, totalAmount: true }
      }
    }
  });

  const formattedCustomers = customers.map((c) => {
    const totalSpent = c.orders.reduce((acc, order) => acc + Number(order.totalAmount), 0);
    return {
      id: c.id,
      name: c.name || "Anonymous Customer",
      email: c.email,
      phone: c.phone || "N/A",
      telegramId: c.telegramId || "Not Linked",
      ordersCount: c.orders.length,
      totalSpent,
      joined: c.createdAt.toISOString(),
      role: c.role,
    };
  });

  return <CustomersClient customers={formattedCustomers} />;
}
