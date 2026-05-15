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
    where: { email: user.email! },
    include: {
      supplier: {
        include: { products: true },
      },
    },
  });

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

  return <DashboardClient supplier={supplier} productCount={supplier.products.length} />;
}
