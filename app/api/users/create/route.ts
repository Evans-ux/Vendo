// app/api/users/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

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
