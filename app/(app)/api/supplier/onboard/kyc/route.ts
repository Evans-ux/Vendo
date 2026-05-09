import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const docType = formData.get("docType") as string;

    if (!file || !docType) {
      return NextResponse.json(
        { message: "File and document type are required" },
        { status: 400 }
      );
    }

    // Get user from database
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

    // Upload file to Supabase Storage (kyc-documents bucket)
    const fileName = `${dbUser.supplier.id}-${Date.now()}-${file.name}`;
    const fileBuffer = await file.arrayBuffer();

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(fileName, fileBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { message: "File upload failed", error: uploadError.message },
        { status: 500 }
      );
    }

    // Get the file URL (private bucket — will need signed URL for admin to view)
    const {
      data: { publicUrl },
    } = supabase.storage.from("kyc-documents").getPublicUrl(fileName);

    // Update supplier record
    await prisma.supplier.update({
      where: { id: dbUser.supplier.id },
      data: {
        kycDocUrl: publicUrl,
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
