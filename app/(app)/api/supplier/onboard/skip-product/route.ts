/**
 * POST /api/supplier/onboard/skip-product
 *
 * Called when a supplier clicks "Skip for now" on the first product step.
 * Advances their onboarding step from KYC_SUBMITTED → FIRST_PRODUCT
 * so the terms page guard lets them through.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { supplier: true },
    });

    if (!dbUser?.supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    // Only advance if still at KYC_SUBMITTED — don't regress if already further
    if (dbUser.supplier.onboardingStep === "KYC_SUBMITTED") {
      await prisma.supplier.update({
        where: { id: dbUser.supplier.id },
        data: { onboardingStep: "FIRST_PRODUCT" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Skip product error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
