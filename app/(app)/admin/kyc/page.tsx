import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getPendingKYC } from "@/app/actions/admin";
import KYCClient from "./KYCClient";

export default async function AdminKYCPage() {
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

  const result = await getPendingKYC();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  // Serialize suppliers with ALL onboarding data
  const suppliers = result.suppliers!.map((s: any) => ({
    id: s.id,
    businessName: s.businessName,
    phone: s.phone,
    address: s.address,
    state: s.state,
    supplierType: s.supplierType,
    kycStatus: s.kycStatus,
    kycDocUrl: s.kycDocUrl,
    kycDocType: s.kycDocType,
    kycSubmittedAt: s.kycSubmittedAt?.toISOString() || null,
    // NEW: Business Verification
    businessDocUrl: s.businessDocUrl,
    businessDocType: s.businessDocType,
    // NEW: Bank Account Details
    bankName: s.bankName,
    accountNumber: s.accountNumber,
    accountHolderName: s.accountHolderName,
    // Other fields
    onboardingStep: s.onboardingStep,
    bio: s.bio,
    logoUrl: s.logoUrl,
    storeBannerUrl: s.storeBannerUrl,
    termsAcceptedAt: s.termsAcceptedAt?.toISOString() || null,
    createdAt: s.createdAt?.toISOString() || null,
    user: s.user,
  }));

  return <KYCClient suppliers={suppliers} />;
}
