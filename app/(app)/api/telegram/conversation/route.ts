import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export interface ConversationMessage {
  telegramId: string;
  role: "user" | "assistant";
  content: string;
  metadata?: Record<string, any>;
}

export async function POST(request: NextRequest) {
  try {
    const body: ConversationMessage = await request.json();
    const { telegramId, role, content } = body;

    if (!telegramId || !role || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    
    // First ensure user exists
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true }
    });

    if (!user) {
      // Create placeholder user if doesn't exist
      user = await prisma.user.create({
        data: {
          telegramId,
          email: `telegram_${telegramId}@vendo.local`,
          name: `User_${telegramId}`,
          role: "CUSTOMER",
        },
        select: { id: true }
      });
    }

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

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json({ error: "Missing telegramId" }, { status: 400 });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        shoeSize: true,
        shirtSize: true,
        lat: true,
        lng: true,
        createdAt: true,
      },
    });

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
        location: user.lat && user.lng ? { lat: Number(user.lat), lng: Number(user.lng) } : null,
        memberSince: user.createdAt,
      },
      history: [],
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Failed to fetch conversation" }, { status: 500 });
  }
}
