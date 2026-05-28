// app/api/suppliers/verified/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Ensures this route is not statically optimized at build time.
export const dynamic = 'force-dynamic';


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

    // Get verified suppliers with their approved, in-stock products in a single query
    const suppliers = await prisma.supplier.findMany({
      where: {
        kycStatus: "APPROVED",
        isActive: true,
      },
      select: {
        id: true,
        businessName: true,
        supplierType: true,
        state: true,
        kycStatus: true,
        businessDocUrl: true,
        accountNumber: true,
        onboardingStep: true,
        products: {
          where: {
            isApproved: true,
            isActive: true,
            stock: { gt: 0 },
            ...(category ? { category } : {}),
          },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            basePrice: true,
            sellingPrice: true,
            imageUrls: true,
            sizes: true,
            stock: true,
            deliveryMethod: true,
            logisticsFee: true,
          },
        },
      },
    });

    // Get order stats for success rates by traversing OrderItem → Product → Supplier
    const orderItems = await prisma.orderItem.findMany({
      where: {
        product: {
          supplierId: { in: suppliers.map((s) => s.id) },
        },
      },
      select: {
        product: { select: { supplierId: true } },
        order: { select: { id: true, status: true } },
      },
    });

    // Group unique orders per supplier for success rate calculation
    const supplierOrderMap = new Map<string, Map<string, string>>();
    for (const item of orderItems) {
      const sid = item.product.supplierId;
      if (!supplierOrderMap.has(sid)) {
        supplierOrderMap.set(sid, new Map());
      }
      // Use a map of orderId → status so each order is counted once per supplier
      supplierOrderMap.get(sid)!.set(item.order.id, item.order.status);
    }

    // Build supplier data with products
    const suppliersWithProducts: SupplierWithProducts[] = [];

    for (const supplier of suppliers) {
      // Map products, handling sizes JSON and Decimal conversions
      const supplierProducts = supplier.products.map((p) => {
        // sizes is auto-deserialized from Json — handle both object and array forms
        let sizes: string[] = [];
        try {
          if (p.sizes) {
            if (Array.isArray(p.sizes)) {
              sizes = p.sizes as string[];
            } else if (typeof p.sizes === "object" && p.sizes !== null) {
              const obj = p.sizes as Record<string, unknown>;
              sizes = Array.isArray(obj.available) ? (obj.available as string[]) : [];
            }
          }
        } catch {
          sizes = [];
        }

        return {
          id: String(p.id),
          name: p.name,
          description: p.description ?? undefined,
          category: p.category ?? undefined,
          basePrice: Number(p.basePrice) || 0,
          sellingPrice: Number(p.sellingPrice) || 0,
          imageUrls: Array.isArray(p.imageUrls) ? p.imageUrls : [],
          sizes,
          stock: p.stock,
          deliveryMethod: p.deliveryMethod || "SELF_DELIVERY",
          logisticsFee: p.logisticsFee != null ? Number(p.logisticsFee) : undefined,
          source: "LOCAL" as const,
        };
      });

      // Calculate logistics info and success rate
      const isDropship = supplier.supplierType === "DROPSHIP";
      const logisticsProvider = isDropship ? "CJ" : "SELF";
      const estimatedDelivery = isDropship ? "14-21 business days" : "2-3 business days";

      // Success rate from order stats (unique orders per supplier)
      const ordersMap = supplierOrderMap.get(supplier.id);
      const totalOrders = ordersMap ? ordersMap.size : 0;
      const successful = ordersMap
        ? [...ordersMap.values()].filter((status) =>
            ["DELIVERED", "COMPLETED", "FULFILLED"].includes(status.toUpperCase())
          ).length
        : 0;
      const successRate = totalOrders > 0 ? (successful / totalOrders) * 100 : 0;

      suppliersWithProducts.push({
        id: String(supplier.id),
        businessName: supplier.businessName,
        supplierType: supplier.supplierType,
        state: supplier.state ?? undefined,
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
