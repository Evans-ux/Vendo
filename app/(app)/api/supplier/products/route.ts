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

    // Block suspended suppliers from uploading during onboarding too
    if (!dbUser.supplier.isActive && dbUser.supplier.onboardingStep === "COMPLETED") {
      return NextResponse.json(
        { message: "Your account has been suspended. Contact support to resolve this." },
        { status: 403 }
      );
    }
    const body = await request.json();
    const { name, description, category, basePrice, stock, sizes, imageUrls, deliveryMethod } = body;

    if (!name || !basePrice || !stock || !imageUrls || imageUrls.length === 0 || !deliveryMethod) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Validate delivery method
    const validDeliveryMethods = ["SELF_DELIVERY", "PLATFORM_LOGISTICS", "DROPSHIP_HANDLED"];
    if (!validDeliveryMethods.includes(deliveryMethod)) {
      return NextResponse.json({ message: "Invalid delivery method" }, { status: 400 });
    }

    // Selling price = base price + 10% markup, rounded to 2dp
    const sellingPrice = Math.round(basePrice * 1.10 * 100) / 100;

    // Calculate logistics fee based on category for PLATFORM_LOGISTICS
    let logisticsFee = null;
    if (deliveryMethod === "PLATFORM_LOGISTICS") {
      const fees: Record<string, number> = {
        'Accessories': 800,
        'Footwear': 1500,
        'Clothing': 1200,
        'Tops': 1200,
        'Bottoms': 1200,
        'Dresses': 1200,
        'Bags': 2000,
        'Jewelry': 800,
        'Other': 1500,
      };
      logisticsFee = fees[category] || 1500;
    }

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
        deliveryMethod,
        logisticsFee,
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
