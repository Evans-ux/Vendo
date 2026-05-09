import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
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
      include: { supplier: true },
    });

    if (!dbUser || !dbUser.supplier) {
      return NextResponse.json(
        { message: "Supplier profile not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, category, basePrice, stock, sizes, imageUrls } =
      body;

    if (!name || !basePrice || !stock || !imageUrls || imageUrls.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate selling price (25% markup)
    const sellingPrice = Math.round(basePrice * 1.25 * 100) / 100;

    // Create product
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
        isApproved: false, // Admin must approve
        isActive: true,
      },
    });

    // Update supplier onboarding step to COMPLETED
    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: {
        onboardingStep: "COMPLETED",
      },
    });

    return NextResponse.json({
      message: "Product created successfully",
      product,
    });
  } catch (error: any) {
    console.error("Product creation error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
