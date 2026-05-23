// lib/telegram-utils.ts
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════
// PRODUCT SEARCH
// ═══════════════════════════════════════════════════════════════════════════

export async function searchProducts(
  query: string,
  limit: number = 5
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    base_price: number;
    selling_price: number;
    image_url: string;
    sizes: string[];
  }>
> {
  try {
    // Initialize Supabase client inside the function to defer execution to runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in telegram-utils.ts");
      return []; // Or throw an error, depending on desired behavior
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("products")
      .select("id, name, description, base_price, image_url, sizes")
      .ilike("name", `%${query}%`)
      .limit(limit);

    if (error) throw error;

    return (
      data?.map((product) => ({
        ...product,
        selling_price: Math.round(product.base_price * 1.25),
      })) || []
    );
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export async function getUserProfile(telegramUserId: string) {
  try {
    // Initialize Supabase client inside the function to defer execution to runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in telegram-utils.ts");
      return null; // Or throw an error
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("telegram_id", telegramUserId)
      .single();

    if (error && error.code !== "PGRST116") throw error;
    return data;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}

export async function updateUserProfile(
  telegramUserId: string,
  updates: Record<string, any>
) {
  try {
    // Initialize Supabase client inside the function to defer execution to runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in telegram-utils.ts");
      return false; // Or throw an error
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const existing = await getUserProfile(telegramUserId);

    if (existing) {
      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("telegram_id", telegramUserId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("users").insert({
        telegram_id: telegramUserId,
        ...updates,
      });
      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error("Update user error:", error);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ORDER CREATION
// ═══════════════════════════════════════════════════════════════════════════

export async function createOrder(
  telegramUserId: string,
  productId: string,
  quantity: number,
  size: string
) {
  try {
    // Initialize Supabase client inside the function to defer execution to runtime
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key_for_build";

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in telegram-utils.ts");
      return { success: false, message: "Server configuration error: Supabase keys are missing." };
    }
    
     const supabase = createClient(supabaseUrl, supabaseKey);
    // Get user
    const user = await getUserProfile(telegramUserId);
    if (!user) {
      return { success: false, message: "User not found. Please register first." };
    }

    // Get product
    const { data: product, error: productError } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (productError || !product) {
      return { success: false, message: "Product not found." };
    }

    // Calculate selling price
    const sellingPrice = Math.round(product.base_price * 1.25) * quantity;

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity,
        size,
        base_price: product.base_price,
        selling_price: sellingPrice,
        status: "pending_payment",
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      order,
      message: `Order created! Total: ₦${sellingPrice.toLocaleString()}`,
    };
  } catch (error) {
    console.error("Order creation error:", error);
    return { success: false, message: "Failed to create order. Try again." };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function formatProductCard(product: any): string {
  return (
    `*${product.name}*\n` +
    `${product.description}\n\n` +
    `💰 Price: ₦${(product.base_price * 1.25).toLocaleString()}\n` +
    `📏 Sizes: ${product.sizes?.join(", ") || "Various"}\n` +
    `ID: \`${product.id}\``
  );
}

export function formatOrderSummary(order: any): string {
  return (
    `*Order Confirmation* ✅\n\n` +
    `Order ID: \`${order.id}\`\n` +
    `Total: ₦${order.selling_price.toLocaleString()}\n` +
    `Status: ${order.status}\n\n` +
    `Proceed to payment: /pay_${order.id}`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERATE PAYMENT LINK (Flutterwave integration placeholder)
// ═══════════════════════════════════════════════════════════════════════════

export async function generatePaymentLink(orderId: string, amount: number): Promise<string | null> {
  try {
    // This would integrate with Flutterwave API
    // For now, return a placeholder
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/payments/flutterwave`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        amount,
      }),
    });

    const data = await response.json();
    return data.payment_link || null;
  } catch (error) {
    console.error("Payment link generation error:", error);
    return null;
  }
}
