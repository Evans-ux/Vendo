import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSupplierNotifications } from "@/app/actions/supplier";
import NotificationsClient from "./NotificationsClient";

export default async function SupplierNotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({ where: { email: user.email! } });
  if (dbUser?.role === "ADMIN") redirect("/admin/dashboard");

  const result = await getSupplierNotifications();

  const notifications = (result.notifications ?? []).map((n: any) => ({
    id: n.id,
    title: n.title,
    message: n.message,
    hasRead: n.hasRead,
    target: n.target,
    createdAt: n.createdAt.toISOString(),
  }));

  return <NotificationsClient notifications={notifications} />;
}
