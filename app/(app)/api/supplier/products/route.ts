import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { supplier: true },
    });

    if (!dbUser || !dbUser.supplier) {
      return NextResponse.json(
        { message: "Supplier profile not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, category, basePrice, stock, sizes, imageUrls } = body;

    if (!name || !basePrice || !stock || !imageUrls || imageUrls.length === 0) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Selling price = base price + 10% markup, rounded to 2dp
    const sellingPrice = Math.round(basePrice * 1.10 * 100) / 100;

    const product = await prisma.product.create({
      data: {
        supplierId: dbUser.supplier.id,
        name,
        description: description || null,
        category: category || null,
        basePrice,
        sellingPrice,
        imageUrls,
        sizes,
        stock,
        isApproved: false,  // approved in bulk when admin approves the supplier's KYC
        isActive: true,
      },
    });

    // Mark onboarding as complete after first product
    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: { onboardingStep: "FIRST_PRODUCT" },
    });

    return NextResponse.json({ message: "Product created successfully", product });
  } catch (error: any) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
