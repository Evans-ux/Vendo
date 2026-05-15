import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupplierProducts } from "@/app/actions/supplier";
import ProductsClient from "./ProductsClient";

export default async function SupplierProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const result = await getSupplierProducts();

  if (!result.success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-destructive">{result.error}</p>
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
    deliveryMethod: p.deliveryMethod,
    logisticsFee: p.logisticsFee ? Number(p.logisticsFee) : null,
    createdAt: p.createdAt.toISOString(),
  }));

  return <ProductsClient products={products} />;
}
