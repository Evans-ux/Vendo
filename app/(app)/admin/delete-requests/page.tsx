import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getDeleteRequests } from "@/app/actions/admin";
import DeleteRequestsClient from "./DeleteRequestsClient";

export default async function AdminDeleteRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser || dbUser.role !== "ADMIN") redirect("/supplier/dashboard");

  const result = await getDeleteRequests();

  const requests = (result.requests ?? []).map((r: any) => ({
    id: r.id,
    reason: r.reason,
    status: r.status,
    adminNote: r.adminNote ?? null,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    product: {
      name: r.product.name,
      imageUrls: r.product.imageUrls,
      isDeleted: r.product.isDeleted,
    },
    supplier: { businessName: r.supplier.businessName },
  }));

  return <DeleteRequestsClient requests={requests} />;
}
