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
    
    // Step 1: Identity Document
    const idFile = formData.get("idFile") as File;
    const idDocType = formData.get("idDocType") as string;
    
    // Step 2: Business Document
    const businessFile = formData.get("businessFile") as File;
    const businessDocType = formData.get("businessDocType") as string;
    
    // Step 3: Bank Account Details
    const bankName = formData.get("bankName") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountHolderName = formData.get("accountHolderName") as string;

    // Validate all required fields
    if (!idFile || !idDocType) {
      return NextResponse.json(
        { message: "Identity document and type are required" },
        { status: 400 }
      );
    }

    if (!businessFile || !businessDocType) {
      return NextResponse.json(
        { message: "Business document and type are required" },
        { status: 400 }
      );
    }

    if (!bankName || !accountNumber || !accountHolderName) {
      return NextResponse.json(
        { message: "All bank account details are required" },
        { status: 400 }
      );
    }

    // Validate account number format
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { message: "Account number must be exactly 10 digits" },
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

    const supplierId = dbUser.supplier.id;

    // Upload Identity Document to Supabase Storage
    const idFileName = `${supplierId}-id-${Date.now()}-${idFile.name}`;
    const idFileBuffer = await idFile.arrayBuffer();

    const { error: idUploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(idFileName, idFileBuffer, {
        contentType: idFile.type,
        upsert: false,
      });

    if (idUploadError) {
      console.error("ID document upload error:", idUploadError);
      return NextResponse.json(
        { message: "Identity document upload failed", error: idUploadError.message },
        { status: 500 }
      );
    }

    // Upload Business Document to Supabase Storage
    const businessFileName = `${supplierId}-business-${Date.now()}-${businessFile.name}`;
    const businessFileBuffer = await businessFile.arrayBuffer();

    const { error: businessUploadError } = await supabase.storage
      .from("kyc-documents")
      .upload(businessFileName, businessFileBuffer, {
        contentType: businessFile.type,
        upsert: false,
      });

    if (businessUploadError) {
      console.error("Business document upload error:", businessUploadError);
      // Clean up the ID document if business upload fails
      await supabase.storage.from("kyc-documents").remove([idFileName]);
      return NextResponse.json(
        { message: "Business document upload failed", error: businessUploadError.message },
        { status: 500 }
      );
    }

    // Store paths (private bucket URLs)
    const idStoragePath = `kyc-documents/${idFileName}`;
    const businessStoragePath = `kyc-documents/${businessFileName}`;

    // Update supplier with all verification data
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        // Identity Document
        kycDocUrl: idStoragePath,
        kycDocType: idDocType,
        kycStatus: "PENDING",
        kycSubmittedAt: new Date(),
        
        // Business Document
        businessDocUrl: businessStoragePath,
        businessDocType: businessDocType,
        
        // Bank Account Details
        bankName: bankName,
        accountNumber: accountNumber,
        accountHolderName: accountHolderName,
        
        // Update onboarding step
        onboardingStep: "KYC_SUBMITTED",
      },
    });

    return NextResponse.json({
      message: "Verification documents and bank details submitted successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("KYC submission error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
