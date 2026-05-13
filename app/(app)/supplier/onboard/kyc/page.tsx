import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import KycStep2Client from "./KycStep2Client"

export default async function SupplierOnboardingStep2() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    include: { supplier: true },
  })

  const step = dbUser?.supplier?.onboardingStep

  // Guard: must have completed step 1 first
  if (!dbUser?.supplier || step === 'NOT_STARTED') redirect("/supplier/onboard")

  // Guard: already past this step
  if (step === 'KYC_SUBMITTED' || step === 'COMPLETED') redirect("/supplier/dashboard")

  return <KycStep2Client />
}
