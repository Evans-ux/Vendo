// app/api/suppliers/verified/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// ═══════════════════════════════════════════════════════════════════════════
// GET ALL VERIFIED SUPPLIERS WITH PRODUCTS
// AI will analyze this data and choose the best supplier
// Includes both LOCAL suppliers and CJ DROPSHIP integration
// ═══════════════════════════════════════════════════════════════════════════

export interface SupplierWithProducts {
  id: string;
  businessName: string;
  supplierType: "LOCAL" | "DROPSHIP";
  state?: string;
  lat?: number;
  lng?: number;
  kycStatus: string;
  businessDocUrl?: string;
  accountNumber?: string;
  onboardingStep: string;
  successRate?: number;
  totalOrders?: number;
  logisticsInfo: {
    provider: "SELF" | "SENDBOX" | "CJ";
    estimatedDelivery: string;
    deliveryMethod: string;
  };
  products: Array<{
    id: string;
    name: string;
    description?: string;
    category?: string;
    basePrice: number;
    sellingPrice: number;
    imageUrls?: string[];
    sizes?: string[];
    stock: number;
    deliveryMethod: string;
    logisticsFee?: number;
    source: "LOCAL" | "DROPSHIP_CJ";
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get("category");
    const verified_only = searchParams.get("verified_only") === "true";

    // Get verified suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .select(
        `id, businessName, supplierType, state, lat, lng, 
         kycStatus, businessDocUrl, accountNumber, onboardingStep, isActive`
      )
      .eq("kycStatus", "APPROVED")
      .eq("isActive", true);

    if (suppliersError) {
      console.error("Suppliers fetch error:", suppliersError);
      return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }

    // Get products for each supplier
    const { data: allProducts, error: productsError } = await supabase
      .from("products")
      .select(
        `id, name, description, category, basePrice, sellingPrice, 
         imageUrls, sizes, stock, deliveryMethod, logisticsFee, supplierId`
      )
      .eq("isApproved", true)
      .eq("isActive", true)
      .gt("stock", 0);

    if (productsError) {
      console.error("Products fetch error:", productsError);
      return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
    }

    // Get order stats for success rates
    const { data: orders } = await supabase.from("orders").select("id, status, supplier_id");

    // Build supplier data with products
    const suppliersWithProducts: SupplierWithProducts[] = [];

    for (const supplier of suppliers || []) {
        // Get products for this supplier
        const supplierProducts = (allProducts || [])
          .filter((p) => p.supplierId === supplier.id)
          .map((p) => {
            // sizes may be stored as JSON or array
            let sizes: string[] = [];
            try {
              if (p.sizes) {
                if (typeof p.sizes === "string") {
                  const parsed = JSON.parse(p.sizes);
                  sizes = parsed?.available ?? [];
                } else if (Array.isArray(p.sizes)) {
                  sizes = p.sizes;
                }
              }
            } catch {
              sizes = [];
            }

            return {
              id: String(p.id),
              name: p.name,
              description: p.description,
              category: p.category,
              basePrice: Number(p.basePrice) || 0,
              sellingPrice: Number(p.sellingPrice) || 0,
              imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
              sizes,
              stock: Number(p.stock) || 0,
              deliveryMethod: p.deliveryMethod || "LOCAL",
              logisticsFee: p.logisticsFee != null ? Number(p.logisticsFee) : undefined,
              source: "LOCAL" as const,
            };
          });

        // Calculate logistics info and success rate
        const isDropship = supplier?.supplierType === "DROPSHIP";
        const logisticsProvider = isDropship ? "CJ" : "SELF";
        const estimatedDelivery = isDropship ? "14-21 business days" : "2-3 business days";

        const supplierOrders = (orders || []).filter((o: any) => o.supplier_id === supplier.id);
        const totalOrders = supplierOrders.length;
        const successful = supplierOrders.filter((o: any) => ["DELIVERED", "COMPLETED", "FULFILLED"].includes((o.status || "").toUpperCase())).length;
        const successRate = totalOrders > 0 ? (successful / totalOrders) * 100 : 0;

        suppliersWithProducts.push({
          id: String(supplier.id),
          businessName: supplier.businessName,
          supplierType: supplier.supplierType,
          state: supplier.state,
          lat: supplier.lat != null ? Number(supplier.lat) : undefined,
          lng: supplier.lng != null ? Number(supplier.lng) : undefined,
          kycStatus: supplier.kycStatus,
          businessDocUrl: supplier.businessDocUrl ? "verified" : "pending",
          accountNumber: supplier.accountNumber ? "verified" : "pending",
          onboardingStep: supplier.onboardingStep,
          successRate: parseFloat(successRate.toFixed(2)),
          totalOrders: totalOrders,
          logisticsInfo: {
            provider: logisticsProvider as "SELF" | "CJ",
            estimatedDelivery,
            deliveryMethod: isDropship ? "CJ Dropshipping Integration" : "Local Delivery",
          },
          products: supplierProducts,
        });
    }

    return NextResponse.json({
      success: true,
      totalSuppliers: suppliersWithProducts.length,
      suppliers: suppliersWithProducts,
    });
  } catch (error) {
    console.error("Verified suppliers endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
