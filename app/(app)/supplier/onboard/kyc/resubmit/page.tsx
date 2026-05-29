import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import prisma from "@/lib/prisma";

import ResubmitClient from "./ResubmitClient";

export default async function KycResubmitPage() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    // Not logged in
    if (authError || !user) {
      redirect("/auth/login");
    }

    // Fetch user with supplier relation
    const dbUser = await prisma.user.findUnique({
      where: {
        id: user.id,
      },

      include: {
        supplier: true,
      },
    });

    // User missing in DB
    if (!dbUser) {
      redirect("/auth/login");
    }

    // Prevent admins from entering supplier route
    if (dbUser.role === "ADMIN") {
      redirect("/admin/dashboard");
    }

    const supplier = dbUser.supplier;

    // No supplier profile yet
    if (!supplier) {
      redirect("/supplier/onboard");
    }

    // Only rejected suppliers can access this page
    if (supplier.kycStatus !== "REJECTED") {
      redirect("/supplier/dashboard");
    }

    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-2xl mx-auto">
          <ResubmitClient
            businessName={
              supplier.businessName
            }
            reason={
              supplier.kycRejectionReason ||
              "Please verify your documents."
            }
          />
        </div>
      </div>
    );
  } catch (error) {
    console.error(
      "KYC_RESUBMIT_PAGE_ERROR:",
      error
    );

    redirect("/supplier/dashboard");
  }
}