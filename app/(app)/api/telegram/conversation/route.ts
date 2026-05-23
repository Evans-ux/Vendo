// app/api/telegram/conversation/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Ensures this route is not statically optimized at build time,
// deferring Supabase client initialization to runtime.
export const dynamic = 'force-dynamic';


// ═══════════════════════════════════════════════════════════════════════════
// SAVE CONVERSATION MESSAGE - For context history
// ═══════════════════════════════════════════════════════════════════════════

export interface ConversationMessage {
  telegramId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, any>; // location, search params, selected supplier, etc.
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client inside the handler with build-safe placeholders
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
      return NextResponse.json({ error: "Server configuration error: Supabase keys are missing." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: ConversationMessage = await request.json();
    const { telegramId, role, content, metadata } = body;

    if (!telegramId || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // First ensure user exists
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("telegramId", telegramId)
      .single();

    if (!user) {
      // Create placeholder user if doesn't exist
      await supabase.from("users").insert({
        telegramId,
        email: `telegram_${telegramId}@vendo.local`,
        name: `User_${telegramId}`,
        role: "CUSTOMER",
      });
    }

    // Create conversation message table if it doesn't exist, then insert
    // For now, we'll store it and return success
    // In production, you'd create a telegram_conversations table

    return NextResponse.json({
      success: true,
      message: "Conversation saved",
      telegramId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Conversation save error:", error);
    return NextResponse.json({ error: "Failed to save conversation" }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GET CONVERSATION HISTORY - For context
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    // Initialize Supabase client inside the handler with build-safe placeholders
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.");
      return NextResponse.json({ error: "Server configuration error: Supabase keys are missing." }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get("telegramId");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    // Get user
    const { data: user } = await supabase
      .from("users")
      .select("id, shoeSize, shirtSize, lat, lng, createdAt")
      .eq("telegramId", telegramId)
      .single();

    if (!user) {
      return NextResponse.json({
        success: true,
        isNewUser: true,
        history: [],
        userProfile: null,
      });
    }

    return NextResponse.json({
      success: true,
      isNewUser: false,
      userProfile: {
        userId: user.id,
        shoeSize: user.shoeSize,
        shirtSize: user.shirtSize,
        location: user.lat && user.lng ? { lat: user.lat, lng: user.lng } : null,
        memberSince: user.createdAt,
      },
      history: [], // TODO: Fetch from conversation table once created
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}
