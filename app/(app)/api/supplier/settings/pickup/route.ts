/**
 * POST /api/supplier/settings/pickup
 * Save the supplier's Sendbox pickup address.
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { supplier: true },
    });
    if (!dbUser?.supplier) {
      return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
    }

    const body = await request.json();
    const { pickupAddress, pickupCity, pickupState, pickupPostCode, pickupPhone } = body;

    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: {
        pickupAddress:  pickupAddress  || null,
        pickupCity:     pickupCity     || null,
        pickupState:    pickupState    || null,
        pickupPostCode: pickupPostCode || null,
        pickupPhone:    pickupPhone    || null,
      },
    });

    return NextResponse.json({ success: true, message: "Pickup address saved" });
  } catch (error: any) {
    console.error("Save pickup address error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
