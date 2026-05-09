import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get user from database
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: {
        supplier: {
          include: {
            products: true,
          },
        },
      },
    });

    if (!dbUser || !dbUser.supplier) {
      return NextResponse.json(
        { message: "Supplier profile not found" },
        { status: 404 }
      );
    }

    const supplier = dbUser.supplier;

    return NextResponse.json({
      businessName: supplier.businessName,
      kycStatus: supplier.kycStatus,
      kycRejectionReason: supplier.kycRejectionReason,
      isActive: supplier.isActive,
      onboardingStep: supplier.onboardingStep,
      productCount: supplier.products.length,
    });
  } catch (error: any) {
    console.error("Status fetch error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
