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

    // Only fully onboarded suppliers can use this dashboard API
    const step = dbUser.supplier.onboardingStep;
    if (step !== "TERMS_ACCEPTED" && step !== "COMPLETED") {
      return NextResponse.json(
        { message: "Access forbidden: Onboarding is not fully complete." },
        { status: 403 }
      );
    }

    // Block suspended suppliers
    if (!dbUser.supplier.isActive) {
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

    // Calculate logistics fee for PLATFORM_LOGISTICS products.
    // Try to fetch a live rate from Sendbox first; fall back to static
    // estimates only if the API call fails so we never block product creation.
    let logisticsFee: number | null = null;
    if (deliveryMethod === "PLATFORM_LOGISTICS") {
      const staticFees: Record<string, number> = {
        Accessories: 800,
        Footwear:    1500,
        Clothing:    1200,
        Tops:        1200,
        Bottoms:     1200,
        Dresses:     1200,
        Bags:        2000,
        Jewelry:     800,
        Other:       1500,
      };

      try {
        // Call our own cheapest-rate endpoint (shares token + payload logic)
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vendo.com.ng";
        const rateRes = await fetch(`${siteUrl}/api/sendbox/cheapest-rate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Pass the internal secret so the route knows this is server-side
            "x-internal-secret": process.env.INTERNAL_API_SECRET ?? "",
          },
          body: JSON.stringify({
            category:    category || "Other",
            originState: dbUser.supplier.state ?? undefined,
          }),
        });

        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (typeof rateData.price === "number" && rateData.price > 0) {
            logisticsFee = rateData.price;
            console.log(
              `[Product Create] Live logistics fee for "${category}": ₦${logisticsFee} (${rateData.source})`
            );
          }
        }
      } catch (rateErr: any) {
        console.warn("[Product Create] Sendbox rate fetch failed:", rateErr.message);
      }

      // Use static fallback if live rate wasn't obtained
      if (!logisticsFee) {
        logisticsFee = staticFees[category] ?? 1500;
        console.log(`[Product Create] Using static logistics fee for "${category}": ₦${logisticsFee}`);
      }
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
        isApproved: false,  // all new products undergo admin review
        isActive: true,
      },
    });

    return NextResponse.json({ message: "Product created successfully", product });
  } catch (error: any) {
    console.error("Dashboard product creation error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
