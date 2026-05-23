// app/api/users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
// The import below is not used and can be removed for clarity
// import { createClient as createServerSupabaseClient } from '@/lib/supabase/server'; 

// Ensures this route is not statically optimized at build time,
// deferring Supabase client initialization to runtime.
export const dynamic = 'force-dynamic';
// ═══════════════════════════════════════════════════════════════════════════
// CREATE USER ENDPOINT - Called by Telegram AI when user is new
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateUserRequest {
  telegramId: string;
  telegramUsername?: string;
  name?: string;
  phone?: string;
  shoeSize?: string;
  shirtSize?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateUserRequest = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
      return NextResponse.json({ error: "Server configuration error: Supabase keys are missing." }, { status: 500 });
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { telegramId, telegramUsername, name, phone, shoeSize, shirtSize } = body;

    // Validate
    if (!telegramId) {
      return NextResponse.json({ error: "telegramId required" }, { status: 400 });
    }

    // Check if user already exists
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("telegramId", telegramId)
      .single();

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "User already exists",
        userId: existing.id,
        isNew: false,
      });
    }

    // Create new user
    const { data: user, error } = await supabase
      .from("users")
      .insert({
        telegramId,
        email: `telegram_${telegramId}@vendo.local`, // placeholder email
        name: name || telegramUsername || `User_${telegramId}`,
        phone,
        shoeSize,
        shirtSize,
        role: "CUSTOMER",
      })
      .select("id, telegramId, name, email")
      .single();

    if (error) {
      console.error("User creation error:", error);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      userId: user.id,
      isNew: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        name: user.name,
      },
    });
  } catch (error) {
    console.error("Create user endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
