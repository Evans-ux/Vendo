import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import ProductsClient from "./ProductsClient";

export default async function SupplierProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  });

  if (dbUser?.role === "ADMIN") redirect("/admin/dashboard");
  if (!dbUser?.supplier) redirect("/supplier/onboard");

  const supplierId = dbUser.supplier.id;

  // Fetch products with order count and pending delete request status
  const rawProducts = await prisma.product.findMany({
    where: { supplierId, isDeleted: false },
    include: {
      _count: { select: { orderItems: true } },
      deleteRequests: {
        where: { status: "PENDING" },
        select: { id: true },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const products = rawProducts.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    basePrice: Number(p.basePrice),
    sellingPrice: Number(p.sellingPrice),
    imageUrls: p.imageUrls,
    stock: p.stock,
    isApproved: p.isApproved,
    isActive: p.isActive,
    deliveryMethod: p.deliveryMethod as "SELF_DELIVERY" | "PLATFORM_LOGISTICS" | "DROPSHIP_HANDLED",
    logisticsFee: p.logisticsFee ? Number(p.logisticsFee) : null,
    createdAt: p.createdAt.toISOString(),
    hasOrders: p._count.orderItems > 0,
    hasPendingDeleteRequest: p.deleteRequests.length > 0,
  }));

  return <ProductsClient products={products} />;
}
