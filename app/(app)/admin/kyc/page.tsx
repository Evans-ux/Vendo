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
    where: { id: user.id },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/supplier/dashboard");
  }

  // Helper to generate signed URLs for private documents
  const generateSignedUrl = async (filePath: string | null) => {
    if (!filePath) return null;
    const { data, error } = await supabase.storage
      .from('kyc-documents') // Assuming 'kyc-documents' is your private bucket name
      .createSignedUrl(filePath, 3600); // URL valid for 1 hour

    if (error) {
      console.error("Error generating signed URL:", error);
      return null;
    }
    return data?.signedUrl || null;
  };

  const result = await getPendingKYC();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <p className="text-red-600">{result.error}</p>
        </div>
    
    );
  }

  // Serialize suppliers with ALL onboarding data
  const suppliers = await Promise.all(result.suppliers!.map(async (s: any) => {
    const kycDocSignedUrl = await generateSignedUrl(s.kycDocUrl);
    const businessDocSignedUrl = await generateSignedUrl(s.businessDocUrl);

    return {
    id: s.id,
    businessName: s.businessName,
    phone: s.phone,
    address: s.address,
    state: s.state,
    supplierType: s.supplierType,
    kycStatus: s.kycStatus,
    kycDocUrl: kycDocSignedUrl, // Use signed URL
    kycDocType: s.kycDocType,
    kycSubmittedAt: s.kycSubmittedAt?.toISOString() || null,
    // NEW: Business Verification
    businessDocUrl: businessDocSignedUrl, // Use signed URL
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
    user: s.user, // Assuming user object is already serialized or safe to pass
    };
  }));

  return <KYCClient suppliers={suppliers} />;
}
