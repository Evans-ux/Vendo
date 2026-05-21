// app/api/users/location/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { error } = await supabase
      .from("users")
      .update({
        lat: lat.toString(),
        lng: lng.toString(),
      })
      .eq("telegramId", telegramId);

    if (error) {
      console.error("Location update error:", error);
      return NextResponse.json({ error: "Failed to update location" }, { status: 500 });
    }

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
