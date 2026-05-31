import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAdminNotifications, getAllSuppliers } from "@/app/actions/admin";
import NotificationsClient from "./NotificationsClient";

export default async function AdminNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/supplier/dashboard");

  const [notifResult, suppliersResult] = await Promise.all([
    getAdminNotifications(),
    getAllSuppliers(),
  ]);

  const notifications = (notifResult.notifications ?? []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    target: n.target,
    hasRead: n.hasRead,
    createdAt: n.createdAt.toISOString(),
    supplierName: n.supplier?.businessName ?? null,
  }));

  const suppliers = (suppliersResult.suppliers ?? []).map((s: any) => ({
    id: s.id,
    businessName: s.businessName,
  }));

  return <NotificationsClient notifications={notifications} suppliers={suppliers} />;
}
