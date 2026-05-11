import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  });

  if (!dbUser?.supplier) {
    redirect("/supplier/onboard");
  }

  // Shape data to match the original DashboardClient interface
  const supplier = {
    id: dbUser.supplier.id,
    full_name: dbUser.name ?? "",
    business_name: dbUser.supplier.businessName,
    email: dbUser.email,
    phone: dbUser.supplier.phone,
    created_at: dbUser.supplier.createdAt.toISOString(),
  };

  return <DashboardClient supplier={supplier} />;
}
