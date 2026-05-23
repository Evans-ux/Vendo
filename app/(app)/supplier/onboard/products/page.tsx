import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import ProductStep3Client from "./ProductStep3Client"

export default async function SupplierOnboardingStep3() {
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

  // Guard: must have submitted KYC first
  if (!dbUser?.supplier || step === 'NOT_STARTED') redirect("/supplier/onboard")
  if (step === 'PROFILE_COMPLETE') redirect("/supplier/onboard/kyc")

  // Guard: already past this step — products are optional so FIRST_PRODUCT also moves forward
  if (step === 'TERMS_ACCEPTED' || step === 'COMPLETED') redirect("/supplier/dashboard")
  if (step === 'FIRST_PRODUCT') redirect("/supplier/onboard/terms")

  // step === 'KYC_SUBMITTED' — show the product form
  return <ProductStep3Client />
}
