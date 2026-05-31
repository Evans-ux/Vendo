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
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      supplier: {
        include: { products: true },
      },
    },
  });

  // Admins should go to admin dashboard, not supplier dashboard
  if (dbUser?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  if (!dbUser?.supplier) {
    redirect("/supplier/onboard");
  }

  // Supplier must have accepted terms to access the dashboard
  const step = dbUser.supplier.onboardingStep
  if (step !== 'TERMS_ACCEPTED' && step !== 'COMPLETED') {
    // Route them to wherever they left off
    if (step === 'NOT_STARTED') redirect("/supplier/onboard")
    if (step === 'PROFILE_COMPLETE') redirect("/supplier/onboard/kyc")
    if (step === 'KYC_SUBMITTED') redirect("/supplier/onboard/products")
    if (step === 'FIRST_PRODUCT') redirect("/supplier/onboard/terms")
    redirect("/supplier/onboard")
  }

  const s = dbUser.supplier;

  // Pending balance (PENDING earnings not yet available)
  const pendingAgg = await prisma.earningsTransaction.aggregate({
    where: { supplierId: s.id, status: "PENDING", type: "CREDIT" },
    _sum: { amount: true },
  });

  // Unread notifications count
  const unreadNotifications = await prisma.notification.count({
    where: {
      OR: [{ supplierId: s.id }, { target: "ALL" }],
      hasRead: false,
    },
  });

  // Recent orders for this supplier (shown directly on dashboard)
  const recentOrders = await prisma.order.findMany({
    where: {
      items: { some: { product: { supplierId: s.id } } },
      paymentStatus: "PAID",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      user: { select: { name: true, phone: true } },
      items: {
        where: { product: { supplierId: s.id } },
        include: { product: { select: { name: true, imageUrls: true } } },
      },
    },
  });

  // Infer the product type directly from the Prisma result
  type PrismaProduct = (typeof s.products)[number];

  // Serialize — Prisma Decimal and Date objects cannot cross the Server→Client boundary
  const supplier = {
    id: s.id,
    userId: s.userId,
    businessName: s.businessName,
    phone: s.phone,
    address: s.address,
    state: s.state,
    supplierType: s.supplierType as string,
    kycStatus: s.kycStatus as string,
    kycDocType: s.kycDocType,
    kycRejectionReason: s.kycRejectionReason,
    kycSubmittedAt: s.kycSubmittedAt?.toISOString() ?? null,
    kycReviewedAt: s.kycReviewedAt?.toISOString() ?? null,
    onboardingStep: s.onboardingStep as string,
    logoUrl: s.logoUrl,
    storeBannerUrl: s.storeBannerUrl,
    bio: s.bio,
    isActive: s.isActive,
    termsAcceptedAt: s.termsAcceptedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    products: s.products.map((p: PrismaProduct) => ({
      id: p.id,
      supplierId: p.supplierId,
      name: p.name,
      description: p.description,
      category: p.category,
      basePrice: Number(p.basePrice),
      sellingPrice: Number(p.sellingPrice),
      imageUrls: p.imageUrls,
      sizes: p.sizes,
      stock: p.stock,
      isApproved: p.isApproved,
      isActive: p.isActive,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  };

  return <DashboardClient
    supplier={supplier}
    productCount={supplier.products.length}
    walletBalance={Number(s.walletBalance)}
    pendingBalance={Number(pendingAgg._sum.amount ?? 0)}
    totalEarned={Number(s.totalEarned)}
    hasPin={!!s.withdrawalPin}
    recentOrders={recentOrders.map((o) => ({
      id: o.id,
      orderNumber: (o as any).orderNumber || o.id.slice(0, 8).toUpperCase(),
      status: o.status as string,
      paymentStatus: o.paymentStatus as string,
      totalAmount: Number(o.totalAmount),
      customerName: o.user.name || "Customer",
      customerPhone: o.user.phone || "",
      createdAt: o.createdAt.toISOString(),
      items: o.items.map((item) => ({
        name: item.product.name,
        image: item.product.imageUrls[0] || null,
        quantity: item.quantity,
      })),
    }))}
    unreadNotifications={unreadNotifications}
  />;
}
