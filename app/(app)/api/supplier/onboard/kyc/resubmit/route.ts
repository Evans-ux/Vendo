import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // 1. Verify supplier existence
    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    });

    if (!supplier) return NextResponse.json({ error: "Supplier record not found" }, { status: 404 });

    // 2. The "Secure Door": Only allow resubmission if currently REJECTED
    if (supplier.kycStatus !== "REJECTED") {
      return NextResponse.json({ error: "Application is not in a rejected state" }, { status: 400 });
    }

    // 3. Parse and Validate FormData
    const formData = await req.formData();
    const kycDocType = formData.get("kycDocType") as string;
    const kycFile = formData.get("kycFile") as File;
    const businessDocType = formData.get("businessDocType") as string;
    const businessFile = formData.get("businessFile") as File;
    const bankName = formData.get("bankName") as string;
    const bankCode = formData.get("bankCode") as string;
    const accountNumber = formData.get("accountNumber") as string;
    const accountHolderName = formData.get("accountHolderName") as string;

    if (!kycFile || !businessFile || !bankCode || !accountNumber || !accountHolderName) {
      return NextResponse.json({ error: "Missing required documents or bank details" }, { status: 400 });
    }

    // 4. Secure File Uploads to Private Bucket
    const uploadToPrivateBucket = async (file: File, folder: string) => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${supplier.id}/resubmit_${folder}_${Date.now()}.${fileExt}`;
      
      const fileBuffer = await file.arrayBuffer(); // Convert to buffer for server-side upload

      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, fileBuffer, {
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.error(`Supabase Storage Error (${folder}):`, error);
        throw new Error(`Failed to upload ${folder} document`);
      }
      return data.path;
    };

    const [kycPath, businessPath] = await Promise.all([
      uploadToPrivateBucket(kycFile, "identity"),
      uploadToPrivateBucket(businessFile, "business")
    ]);

    // 5. Update Database: Reset status to PENDING and clear rejection reason
    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        kycStatus: "PENDING",
        kycRejectionReason: null, 
        kycSubmittedAt: new Date(),
        kycDocType,
        kycDocUrl: kycPath,
        businessDocType,
        businessDocUrl: businessPath,
        bankName,
        bankCode,
        accountNumber,
        accountHolderName,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("KYC_RESUBMIT_ERROR:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}