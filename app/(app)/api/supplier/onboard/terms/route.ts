import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
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
        { message: "Supplier profile not found." },
        { status: 404 }
      );
    }

    if (dbUser.supplier.termsAcceptedAt) {
      // Already accepted — just redirect
      return NextResponse.json({ message: "Terms already accepted", success: true });
    }

    // Stamp the exact time the supplier accepted — creates a legal audit trail
    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: {
        termsAcceptedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: "Terms accepted successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("Terms acceptance error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
