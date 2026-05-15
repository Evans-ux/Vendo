import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import TermsAndConditions from "./TermsAndConditions"

export default async function SupplierTermsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  })

  const step = dbUser?.supplier?.onboardingStep

  // Guard: must have at least submitted KYC to reach terms
  if (!dbUser?.supplier || step === 'NOT_STARTED') redirect("/supplier/onboard")
  if (step === 'PROFILE_COMPLETE') redirect("/supplier/onboard/kyc")
  if (step === 'KYC_SUBMITTED') redirect("/supplier/onboard/products")

  // Guard: already accepted terms
  if (step === 'TERMS_ACCEPTED' || step === 'COMPLETED') redirect("/supplier/dashboard")

  // step === 'FIRST_PRODUCT' (or KYC_SUBMITTED skipped products) — show terms
  return <TermsAndConditions />
}
