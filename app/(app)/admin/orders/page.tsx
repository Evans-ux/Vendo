import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAllOrders } from "@/app/actions/admin";
import OrdersClient from "./OrdersClient";

export default async function AdminOrdersPage({
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

  // Check if user is admin
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/supplier/dashboard");
  }

  const result = await getAllOrders({
    status: searchParams.status,
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

  // Serialize orders
  const orders = result.orders!.map((order: any) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    totalAmount: Number(order.totalAmount),
    shippingAddress: order.shippingAddress,
    createdAt: order.createdAt.toISOString(),
    user: order.user,
    items: order.items.map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      product: {
        name: item.product.name,
        supplier: {
          businessName: item.product.supplier.businessName,
          supplierType: item.product.supplier.supplierType,
        },
      },
    })),
  }));

  return <OrdersClient orders={orders} />;
}
