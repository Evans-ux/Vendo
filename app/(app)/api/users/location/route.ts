// app/api/users/location/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';
// ═══════════════════════════════════════════════════════════════════════════
// UPDATE USER LOCATION - For location-based supplier selection
// ═══════════════════════════════════════════════════════════════════════════

export interface UpdateLocationRequest {
  telegramId: string;
  lat: number;
  lng: number;
  state?: string;
  city?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: UpdateLocationRequest = await request.json();
    const { telegramId, lat, lng, state, city } = body;

    if (!telegramId || lat === undefined || lng === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate coordinates
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates" }, { status: 400 });
    }

    // Update user location
    await prisma.user.update({
      where: { telegramId },
      data: { lat, lng },
    });

    return NextResponse.json({
      success: true,
      message: "Location updated",
      location: { lat, lng, state, city },
    });
  } catch (error) {
    console.error("Location endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
