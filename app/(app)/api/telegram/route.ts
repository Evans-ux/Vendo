// app/api/telegram/route.ts
import { bot } from "@/lib/telegram/bot";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    await bot.handleUpdate(payload);
    return new Response("OK");
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Error", { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "alive", 
    message: "Vendo Bot API is active and listening for webhooks."
  });
}

export const runtime = "nodejs";