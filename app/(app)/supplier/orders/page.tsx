import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getSupplierOrders } from "@/app/actions/supplier";
import OrdersClient from "./OrdersClient";

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check user role - admins should not access supplier pages
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (dbUser?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  const result = await getSupplierOrders(searchParams.status);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{result.error}</p>
        </div>
      </div>
    );
  }

  // Serialize orders
  const orders = result.orders!.map((order: any) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    deliveryAddress: order.deliveryAddress ?? "Not provided",
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    user: order.user,
    items: order.items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      size: item.size ?? null,
      product: {
        id: item.product.id,
        name: item.product.name,
        imageUrls: item.product.imageUrls,
        supplier: {
          supplierType: item.product.supplier?.supplierType || "LOCAL",
        },
      },
    })),
  }));

  return <OrdersClient orders={orders} />;
}
