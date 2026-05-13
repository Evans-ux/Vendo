import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getAllProducts } from "@/app/actions/admin";
import ProductsClient from "./ProductsClient";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { approved?: string };
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
  });

  if (!dbUser || dbUser.role !== "ADMIN") {
    redirect("/supplier/dashboard");
  }

  const isApproved =
    searchParams.approved === "true"
      ? true
      : searchParams.approved === "false"
      ? false
      : undefined;

  const result = await getAllProducts({ isApproved });

  if (!result.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{result.error}</p>
        </div>
      </div>
    );
  }

  // Serialize products
  const products = result.products!.map((p: any) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    basePrice: Number(p.basePrice),
    sellingPrice: Number(p.sellingPrice),
    imageUrls: p.imageUrls,
    stock: p.stock,
    isApproved: p.isApproved,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    supplier: p.supplier,
  }));

  return <ProductsClient products={products} />;
}
