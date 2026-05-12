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

    const body = await request.json();
    const { businessName, phone, address, state, supplierType, bio } = body;

    if (!businessName || !phone) {
      return NextResponse.json(
        { message: "Business name and phone are required" },
        { status: 400 }
      );
    }

    // Upsert the User row (Supabase Auth is the source of truth for identity)
    let dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: user.email!,
          name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          role: "CUSTOMER",
        },
      });
    }

    // Upsert Supplier profile
    const existingSupplier = await prisma.supplier.findUnique({
      where: { userId: dbUser.id },
    });

    if (existingSupplier) {
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

    return NextResponse.json({ message: "Profile saved successfully", success: true });
  } catch (error: any) {
    console.error("Profile save error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
