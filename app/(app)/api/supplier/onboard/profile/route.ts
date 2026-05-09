import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user from Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const { businessName, phone, address, state, supplierType, bio } = body;

    if (!businessName || !phone) {
      return NextResponse.json(
        { message: "Business name and phone are required" },
        { status: 400 }
      );
    }

    // Check if user exists in our database
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    // Create user if doesn't exist
    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: user.user_metadata?.name || null,
          role: "CUSTOMER", // Will be upgraded to SUPPLIER after KYC approval
        },
      });
    }

    // Check if supplier profile already exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: { userId: dbUser.id },
    });

    if (existingSupplier) {
      // Update existing profile
      await prisma.supplier.update({
        where: { userId: dbUser.id },
        data: {
          businessName,
          phone,
          address: address || null,
          state: state || null,
          supplierType,
          bio: bio || null,
          onboardingStep: "PROFILE_COMPLETE",
        },
      });
    } else {
      // Create new supplier profile
      await prisma.supplier.create({
        data: {
          userId: dbUser.id,
          businessName,
          phone,
          address: address || null,
          state: state || null,
          supplierType,
          bio: bio || null,
          onboardingStep: "PROFILE_COMPLETE",
        },
      });
    }

    return NextResponse.json({
      message: "Profile saved successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("Profile save error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
