import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

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
    const existing = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        message: "User already exists",
        userId: existing.id,
        isNew: false,
      });
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        telegramId,
        email: `telegram_${telegramId}@vendo.local`, // placeholder email
        name: name || telegramUsername || `User_${telegramId}`,
        phone,
        shoeSize,
        shirtSize,
        role: "CUSTOMER",
      },
      select: { id: true, telegramId: true, name: true, email: true }
    });

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
