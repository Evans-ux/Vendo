import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * INTERNAL UTILITY — use via Apidog or Postman to promote a user to ADMIN.
 * Request body: { "email": "user@example.com" }
 * Keep this route protected or remove it before going to production.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: "ADMIN" },
    });

    return NextResponse.json({
      message: "User promoted to ADMIN successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error("MakeAdmin error:", error);
    return NextResponse.json(
      { message: "Failed to update user", error: error.message },
      { status: 500 }
    );
  }
}
