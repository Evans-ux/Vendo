import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * TEMPORAL API ROUTE
 * Use this to manually make a user an ADMIN via Apidog or Postman.
 * Request Body: { "email": "user@example.com" }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    // Update the user by their email
    const updatedUser = await prisma.user.update({
      where: { email: email },
      data: { role: "ADMIN" },
    });

    return NextResponse.json({ 
      message: "User promoted to ADMIN successfully", 
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      } 
    });
  } catch (error: any) {
    console.error("MakeAdmin Error:", error);
    return NextResponse.json(
      { message: "Failed to update user", error: error.message },
      { status: 500 }
    );
  }
}