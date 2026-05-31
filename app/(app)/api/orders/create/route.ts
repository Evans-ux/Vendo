// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// ═══════════════════════════════════════════════════════════════════════════
// CREATE ORDER ENDPOINT
// Users can place orders through Telegram or web
// ═══════════════════════════════════════════════════════════════════════════

export interface CreateOrderRequest {
  telegramId?: string;
  userId?: string;
  productId: string;
  quantity: number;
  size: string;
  deliveryAddress?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  name?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const {
      telegramId,
      userId,
      productId,
      quantity,
      size,
      deliveryAddress,
      lat,
      lng,
      phone,
      name,
    } = body;

    // Validate required fields
    if (!productId || !quantity || !size) {
      return NextResponse.json(
        { error: "Missing required fields: productId, quantity, size" },
        { status: 400 }
      );
    }

    if (quantity < 1 || quantity > 100) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }

    // Get or create user
    let user_id = userId;

    if (!user_id && telegramId) {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      });

      if (!user) {
        // Create user if doesn't exist
        try {
          const newUser = await prisma.user.create({
            data: {
              telegramId,
              email: `telegram_${telegramId}@vendo.local`,
              name: name || `User_${telegramId}`,
              phone,
            },
            select: { id: true },
          });
          user_id = newUser.id;
        } catch (userError) {
          console.error("Failed to create user:", userError);
          return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
          );
        }
      } else {
        user_id = user.id;
      }
    }

    if (!user_id) {
      return NextResponse.json(
        { error: "User not found. Please provide userId or telegramId" },
        { status: 400 }
      );
    }

    // Get product details
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        basePrice: true,
        sellingPrice: true,
        stock: true,
        supplierId: true,
        deliveryMethod: true,
        logisticsFee: true,
        sizes: true,
        isActive: true,
        isDeleted: true,
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    if (product.isDeleted || !product.isActive) {
      return NextResponse.json({ error: "This product is no longer available" }, { status: 410 });
    }

    // Check stock
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.stock}` },
        { status: 400 }
      );
    }

    // Validate size
    let availableSizes: string[] = [];
    if (product.sizes) {
      if (typeof product.sizes === "string") {
        try {
          availableSizes = JSON.parse(product.sizes).available || [];
        } catch {
          availableSizes = [];
        }
      } else if (typeof product.sizes === "object" && product.sizes !== null) {
        availableSizes = (product.sizes as any).available || [];
      }
    }

    if (availableSizes.length > 0 && !availableSizes.includes(size)) {
      return NextResponse.json(
        { error: `Invalid size. Available: ${availableSizes.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate total
    const unitPrice = parseFloat(product.sellingPrice.toString());
    const totalAmount = unitPrice * quantity;

    // Get supplier for logistics info
    const supplier = await prisma.supplier.findUnique({
      where: { id: product.supplierId },
      select: {
        id: true,
        supplierType: true,
      },
    });

    // Generate human-readable order number: VND-YYYYMMDD-XXXXX
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randPart = Math.random().toString(36).slice(2, 7).toUpperCase();
    const orderNumber = `VND-${datePart}-${randPart}`;

    // Create order
    let order;
    try {
      order = await prisma.order.create({
        data: {
          userId: user_id,
          orderNumber,
          totalAmount,
          status: "PENDING",
          paymentStatus: "UNPAID",
          deliveryAddress: deliveryAddress || "Not provided",
          lat: lat ? Number(lat) : null,
          lng: lng ? Number(lng) : null,
          logisticsProvider: supplier?.supplierType === "LOCAL" ? "SELF" : "CJ",
        },
        select: { id: true, orderNumber: true },
      });
    } catch (orderError) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Create order items
    try {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId,
          quantity,
          size,
          unitPrice,
        },
      });
    } catch (itemError) {
      console.error("Order item error:", itemError);
      // Attempt to clean up the orphaned order we just created
      await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
      return NextResponse.json(
        { error: "Failed to add items to order" },
        { status: 500 }
      );
    }

    // Reduce product stock
    await prisma.product.update({
      where: { id: productId },
      data: { stock: product.stock - quantity },
    });

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        productName: product.name,
        quantity,
        size,
        unitPrice,
        totalAmount,
        status: "PENDING",
        paymentStatus: "UNPAID",
        deliveryMethod: product.deliveryMethod,
        logisticsFee: product.logisticsFee ? parseFloat(product.logisticsFee.toString()) : null,
        supplier: {
          id: product.supplierId,
          type: supplier?.supplierType,
        },
      },
      nextStep: "Proceed to payment",
      paymentLink: `/api/flutterwave/initialize`,
    });
  } catch (error) {
    console.error("Create order endpoint error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// GET - Retrieve order details
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const telegramId = searchParams.get("telegramId");

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      return NextResponse.json({ success: true, order });
    }

    if (telegramId) {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        select: { id: true },
      });

      if (!user) {
        return NextResponse.json({ orders: [] });
      }

      const orders = await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({ success: true, orders });
    }

    return NextResponse.json(
      { error: "Missing orderId or telegramId" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Get order error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
