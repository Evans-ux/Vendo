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
  }/*───
CJ_API_KEY=CJ5424310@api@a76b3f9b48254fdead6ff0b94528c5ed
NEXT_PUBLIC_SITE_URL=https://vendo-nu.vercel.appINTERNAL_API_SECRET=vendo_internal_secret_change_in_prod

# ─── Site ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://vendo-nu.vercel.app

# ─── Internal secrets ─────────────────────────────────────────────────────────
# Used by Vee AI bot to confirm deliveries — keep this secret
INTERNAL_API_SECRET=vendo_internal_secret_change_in_prod

# Used by cron job to release pending earnings
CRON_SECRET=vendo_cron_secret_change_in_prod
TELEGRAM_BOT_LINK=8949878809:AAHmS0PQwa3RYURqWWm6W0BemevZ-O45OaQ

You’re my backend dev. I use Prisma and Postgres.

Fix my Supplier and Product setup for production. 

Make it so:


OPENAI_API_KEY="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"
*/
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
  />;
}
