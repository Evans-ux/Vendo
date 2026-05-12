import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const images = formData.getAll("images") as File[];

    if (images.length === 0) {
      return NextResponse.json({ message: "No images provided" }, { status: 400 });
    }

    const imageUrls: string[] = [];

    for (const image of images) {
      const fileName = `${user.id}-${Date.now()}-${image.name}`;
      const fileBuffer = await image.arrayBuffer();

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, fileBuffer, {
          contentType: image.type,
          upsert: false,
        });

      if (uploadError) {
        console.error("Image upload error:", uploadError);
        continue; // skip failed uploads, don't abort the whole batch
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(fileName);

      imageUrls.push(publicUrl);
    }

    if (imageUrls.length === 0) {
      return NextResponse.json({ message: "All image uploads failed" }, { status: 500 });
    }

    return NextResponse.json({ message: "Images uploaded successfully", imageUrls });
  } catch (error: any) {
    console.error("Image upload error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}
