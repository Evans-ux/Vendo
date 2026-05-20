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

  // Guard: must have completed step 1 first
  if (!dbUser?.supplier || step === 'NOT_STARTED') redirect("/supplier/onboard")

    if (step === 'TERMS_ACCEPTED' || step === "COMPLETED") redirect ("/supplier/dashboard")
    if (step === 'FIRST_PRODUCT') redirect("/supplier/onboard/terms")
  // Guard: already past this step
    if (step === 'KYC_SUBMITTED') redirect("/supplier/onboard/products");
    

  return <KycStep2Client />
}
