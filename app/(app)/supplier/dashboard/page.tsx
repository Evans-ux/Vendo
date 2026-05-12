import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function SupplierDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get full supplier profile from Prisma
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: {
      supplier: {
        include: { products: true },
      },
    },
  });

  // If no supplier profile yet, send them to onboarding
  if (!dbUser?.supplier) {
    redirect("/supplier/onboard");
  }

  return <DashboardClient supplier={dbUser.supplier} productCount={dbUser.supplier.products.length} />;
}
