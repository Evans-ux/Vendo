import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const docType = formData.get("docType") as string;

    if (!file || !docType) {
      return NextResponse.json(
        { message: "File and document type are required" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { supplier: true },
    });

    if (!dbUser || !dbUser.supplier) {
      return NextResponse.json(
        { message: "Supplier profile not found. Complete Step 1 first." },
        { status: 404 }
      );
    }

    // Upload to Supabase Storage — kyc-documents bucket (private)
    const fileName = `${dbUser.supplier.id}-${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("KYC upload error:", uploadError);
      return NextResponse.json(
        { message: "File upload failed", error: uploadError.message },
        { status: 500 }
      );
    }

    // Store the storage path (not a public URL — this is a private bucket)
    const storagePath = `kyc-documents/${fileName}`;

    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: {
        kycDocUrl: storagePath,
        kycDocType: docType,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        onboardingStep: "KYC_SUBMITTED",
      },
    });

    return NextResponse.json({
      message: "KYC document uploaded successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("KYC upload error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
