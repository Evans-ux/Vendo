import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAllSuppliers } from "@/app/actions/admin";
import SuppliersClient from "./SuppliersClient";

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: { status?: string; kycStatus?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/supplier/dashboard");
  }

  const result = await getAllSuppliers({
    status: searchParams.status as any,
    kycStatus: searchParams.kycStatus as any,
  });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  // Serialize suppliers
  const suppliers = result.suppliers!.map((s: any) => ({
    id: s.id,
    businessName: s.businessName,
    phone: s.phone,
    state: s.state,
    supplierType: s.supplierType,
    kycStatus: s.kycStatus,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    user: s.user,
    productCount: s._count.products,
  }));

  return <SuppliersClient suppliers={suppliers} />;
}
