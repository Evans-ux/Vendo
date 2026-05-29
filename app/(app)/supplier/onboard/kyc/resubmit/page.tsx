import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import ResubmitClient from "./ResubmitClient";

export default async function KycResubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { supplier: true },
  });

  // Admins should not access supplier resubmission
  if (dbUser?.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  const supplier = dbUser?.supplier;
  const kycStatus = supplier?.kycStatus;

  if (!supplier) redirect("/supplier/onboard");

  // Safety check: Only allow if status is REJECTED.
  // If it's PENDING or APPROVED, they should be on the dashboard.
  if (kycStatus !== "REJECTED") {
    redirect("/supplier/dashboard");
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <ResubmitClient
          businessName={supplier.businessName}
          reason={supplier.kycRejectionReason || "Please verify your documents."}
        />
      </div>
    </div>
  );
}