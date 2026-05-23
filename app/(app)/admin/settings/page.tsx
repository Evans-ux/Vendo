import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings | Admin Dashboard",
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id }
  });

  if (dbUser?.role !== "ADMIN") {
    redirect("/");
  }

  // Pre-load current admin settings from the DB (using dbUser params for now)
  const adminData = {
    name: dbUser.name || "Admin User",
    email: dbUser.email,
    phone: dbUser.phone || "",
    role: dbUser.role
  };

  return <SettingsClient initialData={adminData} />;
}
