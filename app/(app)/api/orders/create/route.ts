// app/api/orders/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "placeholder_key_for_build";
const supabase = createClient(supabaseUrl, supabaseKey);

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
      const { data: user } = await supabase
        .from("User") // Standardizing to singular "User" to match Prisma default
        .select("id")
        .eq("telegramId", telegramId)
        .single();

      if (!user) {
        // Create user if doesn't exist
        const { data: newUser, error: userError } = await supabase
          .from("User")
          .insert({
            telegramId,
            email: `telegram_${telegramId}@vendo.local`,
            name: name || `User_${telegramId}`,
            phone,
          })
          .select("id")
          .single();

        if (userError || !newUser) {
          return NextResponse.json(
            { error: "Failed to create user" },
            { status: 500 }
          );
        }
        user_id = newUser.id;
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
    const { data: product, error: productError } = await supabase
      .from("Product") // Assuming singular based on Prisma convention
      .select(
        `id, name, basePrice, sellingPrice, stock, 
         supplierId, deliveryMethod, logisticsFee, sizes`
      )
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check stock
    if (product.stock < quantity) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.stock}` },
        { status: 400 }
      );
    }

    // Validate size
    const availableSizes = product.sizes
      ? JSON.parse(product.sizes).available || []
      : [];
    if (availableSizes.length > 0 && !availableSizes.includes(size)) {
      return NextResponse.json(
        { error: `Invalid size. Available: ${availableSizes.join(", ")}` },
        { status: 400 }
      );
    }

    // Calculate total
    const unitPrice = parseFloat(product.sellingPrice);
    const totalAmount = unitPrice * quantity;

    // Get supplier for logistics info
    const { data: supplier } = await supabase
      .from("Supplier")
      .select("id, supplierType, deliveryMethod")
      .eq("id", product.supplierId)
      .single();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from("Order")
      .insert({
        userId: user_id,
        totalAmount,
        status: "PENDING",
        paymentStatus: "UNPAID",
        deliveryAddress: deliveryAddress || "Not provided",
        lat: lat || null,
        lng: lng || null,
        logisticsProvider: supplier?.supplierType === "LOCAL" ? "SELF" : "CJ",
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
    }

    // Create order items
    const { error: itemError } = await supabase.from("OrderItem").insert({
      orderId: order.id,
      productId,
      quantity,
      size,
      unitPrice,
    });

    if (itemError) {
      console.error("Order item error:", itemError);
      return NextResponse.json(
        { error: "Failed to add items to order" },
        { status: 500 }
      );
    }

    // Reduce product stock
    await supabase
      .from("Product")
      .update({ stock: product.stock - quantity })
      .eq("id", productId);

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order: {
        id: order.id,
        productName: product.name,
        quantity,
        size,
        unitPrice,
        totalAmount,
        status: "PENDING",
        paymentStatus: "UNPAID",
        deliveryMethod: product.deliveryMethod,
        logisticsFee: product.logisticsFee ? parseFloat(product.logisticsFee) : null,
        supplier: {
          id: product.supplierId,
          type: supplier?.supplierType,
        },
      },
      nextStep: "Proceed to payment",
      paymentLink: `/api/payments/flutterwave?orderId=${order.id}`,
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
      const { data: order } = await supabase
        .from("Order")
        .select("*")
        .eq("id", orderId)
        .single();

      return NextResponse.json({ success: true, order });
    }

    if (telegramId) {
      const { data: user } = await supabase
        .from("User")
        .select("id")
        .eq("telegramId", telegramId)
        .single();

      if (!user) {
        return NextResponse.json({ orders: [] });
      }

      const { data: orders } = await supabase
        .from("Order")
        .select("*")
        .eq("userId", user.id)
        .order("createdAt", { ascending: false });

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
