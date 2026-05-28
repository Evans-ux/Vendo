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

    // Identity Document
    const idFile    = formData.get("idFile")    as File;
    const idDocType = formData.get("idDocType") as string;

    // Business Document
    const businessFile    = formData.get("businessFile")    as File;
    const businessDocType = formData.get("businessDocType") as string;

    // Bank Account Details (accountHolderName is the Flutterwave-verified name)
    const bankName          = formData.get("bankName")          as string;
    const bankCode          = formData.get("bankCode")          as string | null;
    const accountNumber     = formData.get("accountNumber")     as string;
    const accountHolderName = formData.get("accountHolderName") as string;

    // ── Validation ────────────────────────────────────────────────────────────
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
    if (!/^\d{10}$/.test(accountNumber)) {
      return NextResponse.json(
        { message: "Account number must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // ── Look up user by Supabase UUID (not email) ─────────────────────────────
    // Using id is more reliable — the webhook/signup creates the row with the UUID.
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { supplier: true },
    });

    if (!dbUser) {
      // Fallback: try by email in case the row was created before UUID sync
      const byEmail = await prisma.user.findUnique({
        where: { email: user.email! },
        include: { supplier: true },
      });
      if (!byEmail || !byEmail.supplier) {
        return NextResponse.json(
          { message: "Supplier profile not found. Please complete Step 1 first." },
          { status: 404 }
        );
      }
      // If found by email but id doesn't match, update the id
      if (byEmail.id !== user.id) {
        await prisma.user.update({
          where: { email: user.email! },
          data: { id: user.id },
        });
      }
      return handleUpload(supabase, byEmail.supplier.id, {
        idFile, idDocType, businessFile, businessDocType,
        bankName, bankCode, accountNumber, accountHolderName,
      });
    }

    if (!dbUser.supplier) {
      return NextResponse.json(
        { message: "Supplier profile not found. Please complete Step 1 first." },
        { status: 404 }
      );
    }

    return handleUpload(supabase, dbUser.supplier.id, {
      idFile, idDocType, businessFile, businessDocType,
      bankName, bankCode, accountNumber, accountHolderName,
    });

  } catch (error: any) {
    console.error("KYC submission error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// ── Extracted upload + DB update logic ────────────────────────────────────────

async function handleUpload(
  supabase: Awaited<ReturnType<typeof createClient>>,
  supplierId: string,
  fields: {
    idFile: File;
    idDocType: string;
    businessFile: File;
    businessDocType: string;
    bankName: string;
    bankCode: string | null;
    accountNumber: string;
    accountHolderName: string;
  }
) {
  const {
    idFile, idDocType, businessFile, businessDocType,
    bankName, bankCode, accountNumber, accountHolderName,
  } = fields;

  // Upload Identity Document
  const idFileName   = `${supplierId}-id-${Date.now()}-${idFile.name}`;
  const idFileBuffer = await idFile.arrayBuffer();

  const { error: idUploadError } = await supabase.storage
    .from("kyc-documents")
    .upload(idFileName, idFileBuffer, { contentType: idFile.type, upsert: false });

  if (idUploadError) {
    console.error("ID document upload error:", idUploadError);
    return NextResponse.json(
      { message: "Identity document upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Upload Business Document
  const businessFileName   = `${supplierId}-business-${Date.now()}-${businessFile.name}`;
  const businessFileBuffer = await businessFile.arrayBuffer();

  const { error: businessUploadError } = await supabase.storage
    .from("kyc-documents")
    .upload(businessFileName, businessFileBuffer, { contentType: businessFile.type, upsert: false });

  if (businessUploadError) {
    console.error("Business document upload error:", businessUploadError);
    // Clean up the already-uploaded ID doc
    await supabase.storage.from("kyc-documents").remove([idFileName]);
    return NextResponse.json(
      { message: "Business document upload failed. Please try again." },
      { status: 500 }
    );
  }

  // Update supplier record
  await prisma.supplier.update({
    where: { id: supplierId },
    data: {
      kycDocUrl:          `kyc-documents/${idFileName}`,
      kycDocType:         idDocType,
      kycStatus:          "PENDING",
      kycSubmittedAt:     new Date(),
      businessDocUrl:     `kyc-documents/${businessFileName}`,
      businessDocType:    businessDocType,
      bankName:           bankName,
      bankCode:           bankCode ?? null,   // ← was missing — required for FLW subaccount creation
      accountNumber:      accountNumber,
      accountHolderName:  accountHolderName,
      onboardingStep:     "KYC_SUBMITTED",
    },
  });

  return NextResponse.json({
    message: "Verification documents submitted successfully",
    success: true,
  });
}
