import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import KycStep2Client from "./KycStep2Client"

export default async function SupplierOnboardingStep2() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { supplier: true },
  })

  // Admins should not access supplier onboarding
  if (dbUser?.role === "ADMIN") {
    redirect("/admin/dashboard")
  }

  const step = dbUser?.supplier?.onboardingStep
  const kycStatus = dbUser?.supplier?.kycStatus

  // Guard: must have completed step 1 first
  if (!dbUser?.supplier || step === 'NOT_STARTED') redirect("/supplier/onboard")

  if (step === 'TERMS_ACCEPTED' || step === "COMPLETED") redirect("/supplier/dashboard")
  if (step === 'FIRST_PRODUCT') redirect("/supplier/onboard/terms")

  // REJECTED suppliers must be allowed back to re-submit — don't redirect them away.
  // KYC_SUBMITTED guard: only redirect forward if status is still PENDING (not REJECTED).
  if (step === 'KYC_SUBMITTED' && kycStatus !== 'REJECTED') {
    redirect("/supplier/onboard/products")
  }
    

  return <KycStep2Client />
}
