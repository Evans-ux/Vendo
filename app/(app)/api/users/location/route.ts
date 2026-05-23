// app/api/users/location/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'; // Use the server-side client helper

// Ensures this route is not statically optimized at build time,
// deferring Supabase client initialization to runtime.
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
      return NextResponse.json({ error: "Server configuration error: Supabase keys are missing." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
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
