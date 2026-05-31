import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import EditProductClient from "./EditProductClient";

export default async function EditProductPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  });

  if (!dbUser?.supplier) redirect("/supplier/onboard");

  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { orderItems: true } },
    },
  });

  if (!product || product.supplierId !== dbUser.supplier.id || product.isDeleted) {
    notFound();
  }

  // If the product has been ordered, editing is locked
  const hasOrders = product._count.orderItems > 0;

  return (
    <EditProductClient
      product={{
        id: product.id,
        name: product.name,
        description: product.description ?? "",
        category: product.category ?? "",
        basePrice: Number(product.basePrice),
        sellingPrice: Number(product.sellingPrice),
        stock: product.stock,
        sizes: (product.sizes as any)?.available?.join(", ") ?? "",
        imageUrls: product.imageUrls,
        deliveryMethod: product.deliveryMethod as any,
        logisticsFee: product.logisticsFee ? Number(product.logisticsFee) : null,
        isApproved: product.isApproved,
      }}
      hasOrders={hasOrders}
    />
  );
}
