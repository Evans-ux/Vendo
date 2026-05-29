export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier record not found" },
        { status: 404 }
      );
    }

    // Only rejected suppliers can resubmit
    if (supplier.kycStatus !== "REJECTED") {
      return NextResponse.json(
        {
          error:
            "Application is not in a rejected state",
        },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await req.formData();

    const kycDocType = formData.get(
      "kycDocType"
    ) as string;

    const kycFile = formData.get(
      "kycFile"
    ) as File;

    const businessDocType = formData.get(
      "businessDocType"
    ) as string;

    const businessFile = formData.get(
      "businessFile"
    ) as File;

    const bankName = formData.get(
      "bankName"
    ) as string;

    const bankCode = formData.get(
      "bankCode"
    ) as string;

    const accountNumber = formData.get(
      "accountNumber"
    ) as string;

    const accountHolderName = formData.get(
      "accountHolderName"
    ) as string;

    // Validation
    if (
      !kycFile ||
      !businessFile ||
      !bankName ||
      !bankCode ||
      !accountNumber ||
      !accountHolderName
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required documents or bank details",
        },
        { status: 400 }
      );
    }

    // Upload helper
    const uploadToPrivateBucket = async (
      file: File,
      folder: string
    ) => {
      try {
        if (!file || file.size === 0) {
          throw new Error(
            `${folder} file is empty`
          );
        }

        // 10MB limit
        const MAX_SIZE = 10 * 1024 * 1024;

        if (file.size > MAX_SIZE) {
          throw new Error(
            `${folder} file exceeds 10MB limit`
          );
        }

        const allowedTypes = [
          "image/jpeg",
          "image/png",
          "image/webp",
          "application/pdf",
        ];

        if (
          !allowedTypes.includes(file.type)
        ) {
          throw new Error(
            `Invalid ${folder} file type`
          );
        }

        const fileExt = file.name
          .split(".")
          .pop();

        const fileName = `${supplier.id}/${folder}_${Date.now()}.${fileExt}`;

        // FIXED BUFFER CONVERSION
        const buffer = Buffer.from(
          await file.arrayBuffer()
        );

        const { data, error } =
          await supabase.storage
            .from("kyc-documents")
            .upload(fileName, buffer, {
              contentType: file.type,
              upsert: false,
            });

        if (error) {
          console.error(
            `UPLOAD ERROR (${folder})`,
            error
          );

          throw new Error(error.message);
        }

        return data.path;
      } catch (err: any) {
        console.error(
          `FAILED ${folder} UPLOAD`,
          err
        );

        throw new Error(
          err.message ||
            `Failed to upload ${folder} document`
        );
      }
    };

    // Upload KYC first
    const kycPath =
      await uploadToPrivateBucket(
        kycFile,
        "identity"
      );

    // Upload business file second
    let businessPath: string;

    try {
      businessPath =
        await uploadToPrivateBucket(
          businessFile,
          "business"
        );
    } catch (err) {
      // rollback KYC upload if second upload fails
      await supabase.storage
        .from("kyc-documents")
        .remove([kycPath]);

      throw err;
    }

    // OLD FILES CLEANUP
    const filesToDelete: string[] = [];

    if (supplier.kycDocUrl) {
      filesToDelete.push(
        supplier.kycDocUrl.replace(
          "kyc-documents/",
          ""
        )
      );
    }

    if (supplier.businessDocUrl) {
      filesToDelete.push(
        supplier.businessDocUrl.replace(
          "kyc-documents/",
          ""
        )
      );
    }

    // Update DB
    await prisma.supplier.update({
      where: {
        id: supplier.id,
      },
      data: {
        kycStatus: "PENDING",
        kycRejectionReason: null,
        kycSubmittedAt: new Date(),

        kycDocType,
        kycDocUrl: `kyc-documents/${kycPath}`,

        businessDocType,
        businessDocUrl: `kyc-documents/${businessPath}`,

        bankName,
        bankCode,
        accountNumber,
        accountHolderName,
      },
    });

    // Delete old files AFTER successful DB update
    if (filesToDelete.length > 0) {
      try {
        const { error } =
          await supabase.storage
            .from("kyc-documents")
            .remove(filesToDelete);

        if (error) {
          console.error(
            "DELETE ERROR:",
            error
          );
        }
      } catch (err) {
        console.error(
          "DELETE FAILED:",
          err
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error(
      "KYC_RESUBMIT_ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Internal server error",
      },
      { status: 500 }
    );
  }
}