import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import OnboardingStep1Client from "./OnboardingStep1Client"

export default async function SupplierOnboardingStep1() {
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

  // Resume from where they left off — don't restart them at step 1
  if (step === 'TERMS_ACCEPTED' || step === "COMPLETED") redirect ("/supplier/dashboard")
  if (step === 'FIRST_PRODUCT') redirect("/supplier/onboard/terms")
  if (step === 'KYC_SUBMITTED') redirect("/supplier/onboard/products")
  if (step === 'PROFILE_COMPLETE') redirect("/supplier/onboard/kyc")

  return <OnboardingStep1Client />
}
