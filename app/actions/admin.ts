'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { createClient } from "@/lib/supabase/server"

// ── Telegram helper (fire-and-forget) ────────────────────────────────────────
async function notifyTelegram(telegramId: string | null | undefined, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token || !telegramId) return
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramId, text, parse_mode: 'Markdown' }),
    })
  } catch (err) {
    console.error('[Admin] Telegram notify error:', err)
  }
}

// ============================================
// SUPPLIER MANAGEMENT
// ============================================

export async function getAllSuppliers(filters?: {
  status?: 'active' | 'inactive'
  kycStatus?: 'PENDING' | 'APPROVED' | 'REJECTED'
}) {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        ...(filters?.status && { isActive: filters.status === 'active' }),
        ...(filters?.kycStatus && { kycStatus: filters.kycStatus }),
      },
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, suppliers }
  } catch (error) {
    console.error('Error fetching suppliers:', error)
    return { success: false, error: 'Failed to fetch suppliers' }
  }
}

export async function getSupplierById(supplierId: string) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: {
        user: true,
        products: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    })
    if (!supplier) return { success: false, error: 'Supplier not found' }
    return { success: true, supplier }
  } catch (error) {
    console.error('Error fetching supplier:', error)
    return { success: false, error: 'Failed to fetch supplier' }
  }
}

export async function toggleSupplierStatus(supplierId: string) {
  try {
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) return { success: false, error: 'Supplier not found' }
    await prisma.supplier.update({
      where: { id: supplierId },
      data: { isActive: !supplier.isActive },
    })
    revalidatePath('/admin/suppliers')
    return { success: true, message: 'Supplier status updated' }
  } catch (error) {
    console.error('Error toggling supplier status:', error)
    return { success: false, error: 'Failed to update supplier status' }
  }
}

// ============================================
// KYC MANAGEMENT
// ============================================

export async function getPendingKYC() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { kycStatus: 'PENDING', kycDocUrl: { not: null } },
      include: { user: { select: { email: true, name: true, telegramId: true } } },
      orderBy: { kycSubmittedAt: 'asc' },
    })
    return { success: true, suppliers }
  } catch (error) {
    console.error('Error fetching pending KYC:', error)
    return { success: false, error: 'Failed to fetch pending KYC' }
  }
}

export async function approveKYC(supplierId: string) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { user: true },
    });
    if (!supplier) return { success: false, error: 'Supplier not found' };

    // Create Flutterwave subaccount if supplier has bank details and no subaccount yet
    let flwSubaccountId = supplier.flwSubaccountId;
    let subaccountWarning: string | null = null;

    if (!flwSubaccountId && supplier.bankCode && supplier.accountNumber && supplier.businessName) {
      try {
        const { createSubaccount } = await import('@/lib/flutterwave');
        const subaccount = await createSubaccount({
          account_bank: supplier.bankCode,
          account_number: supplier.accountNumber,
          business_name: supplier.businessName,
          business_email: supplier.user.email,
          country: 'NG',
          split_type: 'percentage',
          // Supplier gets 90% — platform keeps 10% commission automatically
          split_value: 0.9,
        });
        flwSubaccountId = subaccount.subaccount_id;
        console.log(`[KYC Approve] Created FLW subaccount: ${flwSubaccountId} for ${supplier.businessName}`);
      } catch (flwErr: any) {
        // Non-blocking — log and surface as a warning but don't fail the approval.
        // Admin can retry subaccount creation from the supplier settings page.
        subaccountWarning = `Flutterwave subaccount creation failed: ${flwErr.message}. Supplier is approved but split payments won't work until this is resolved.`;
        console.error('[KYC Approve] Flutterwave subaccount creation failed:', flwErr.message);
      }
    } else if (!supplier.bankCode || !supplier.accountNumber) {
      subaccountWarning = 'Supplier has no bank details on file — subaccount not created. Split payments will not work until they add bank details.';
    }

    // Approve the supplier and activate their account
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'APPROVED',
        kycReviewedAt: new Date(),
        isActive: true,
        onboardingStep: 'COMPLETED',
        ...(flwSubaccountId ? { flwSubaccountId } : {}),
      },
    });

    // Approve all products this supplier has uploaded
    await prisma.product.updateMany({
      where: { supplierId },
      data: { isApproved: true },
    });

    // Upgrade the user's role to SUPPLIER
    await prisma.user.update({
      where: { id: supplier.userId },
      data: { role: 'SUPPLIER' },
    });

    // Notify supplier on Telegram (fire-and-forget)
    await notifyTelegram(
      supplier.user.telegramId,
      `🎉 *Your Vendo account has been approved!*\n\n` +
      `Welcome to Vendo, *${supplier.businessName}*!\n\n` +
      `Your KYC verification is complete and your store is now live. ` +
      `Customers can now discover and order your products.\n\n` +
      `Visit your dashboard to manage your products and track orders: ` +
      `https://vendo.com.ng/supplier/dashboard`
    );

    revalidatePath('/admin/kyc');
    return {
      success: true,
      message: `${supplier.businessName} approved${flwSubaccountId ? ' + FLW subaccount created' : ''}.`,
      ...(subaccountWarning ? { warning: subaccountWarning } : {}),
    };
  } catch (error) {
    console.error('Error approving KYC:', error);
    return { success: false, error: 'Failed to approve KYC' };
  }
}

export async function rejectKYC(supplierId: string, reason: string) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
      include: { user: { select: { telegramId: true } } },
    })
    if (!supplier) return { success: false, error: 'Supplier not found' }

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'REJECTED',
        kycRejectionReason: reason,
        kycReviewedAt: new Date(),
      },
    })

    // Notify supplier on Telegram (fire-and-forget)
    await notifyTelegram(
      supplier.user.telegramId,
      `⚠️ *KYC Verification Update*\n\n` +
      `Unfortunately, your Vendo KYC submission was not approved.\n\n` +
      `*Reason:* ${reason}\n\n` +
      `Please review the feedback, update your documents, and resubmit at:\n` +
      `https://vendo.com.ng/supplier/onboard/kyc\n\n` +
      `If you have questions, contact support.`
    )

    revalidatePath('/admin/kyc')
    return { success: true, message: 'KYC rejected and supplier notified' }
  } catch (error) {
    console.error('Error rejecting KYC:', error)
    return { success: false, error: 'Failed to reject KYC' }
  }
}

// ============================================
// ORDER MANAGEMENT
// ============================================

export async function getAllOrders(filters?: { status?: string }) {
  try {
    const orders = await prisma.order.findMany({
      where: { ...(filters?.status && { status: filters.status as any }) },
      include: {
        user: { select: { name: true, email: true } },
        items: {
          include: {
            product: {
              include: {
                supplier: { select: { businessName: true, supplierType: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, orders }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { success: false, error: 'Failed to fetch orders' }
  }
}

export async function getOrderById(orderId: string) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        items: { include: { product: { include: { supplier: true } } } },
      },
    })
    if (!order) return { success: false, error: 'Order not found' }
    return { success: true, order }
  } catch (error) {
    console.error('Error fetching order:', error)
    return { success: false, error: 'Failed to fetch order' }
  }
}

// ============================================
// PRODUCT MANAGEMENT
// ============================================

export async function getAllProducts(filters?: {
  isApproved?: boolean
  supplierId?: string
}) {
  try {
    const products = await prisma.product.findMany({
      where: {
        ...(filters?.isApproved !== undefined && { isApproved: filters.isApproved }),
        ...(filters?.supplierId && { supplierId: filters.supplierId }),
      },
      include: { supplier: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, products }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { success: false, error: 'Failed to fetch products' }
  }
}

export async function approveProduct(productId: string) {
  try {
    await prisma.product.update({ where: { id: productId }, data: { isApproved: true } })
    revalidatePath('/admin/products')
    return { success: true, message: 'Product approved' }
  } catch (error) {
    console.error('Error approving product:', error)
    return { success: false, error: 'Failed to approve product' }
  }
}

export async function rejectProduct(productId: string) {
  try {
    await prisma.product.update({
      where: { id: productId },
      data: { isApproved: false, isActive: false },
    })
    revalidatePath('/admin/products')
    return { success: true, message: 'Product rejected' }
  } catch (error) {
    console.error('Error rejecting product:', error)
    return { success: false, error: 'Failed to reject product' }
  }
}

// ============================================
// DASHBOARD STATS
// ============================================

export interface AdminStats {
  totalSuppliers: number
  activeSuppliers: number
  pendingKYC: number
  totalOrders: number
  pendingOrders: number
  totalProducts: number
  pendingProducts: number
  totalRevenue: number  // always a plain number — Decimal serialized here
}

export async function getAdminStats(): Promise<{ success: true; stats: AdminStats } | { success: false; error: string }> {
  try {
    const [
      totalSuppliers,
      activeSuppliers,
      pendingKYC,
      totalOrders,
      pendingOrders,
      totalProducts,
      pendingProducts,
      revenueAgg,
    ] = await Promise.all([
      prisma.supplier.count(),
      prisma.supplier.count({ where: { isActive: true } }),
      prisma.supplier.count({ where: { kycStatus: 'PENDING' } }),
      prisma.order.count(),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.product.count(),
      prisma.product.count({ where: { isApproved: false } }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: 'PAID' },
      }),
    ])

    return {
      success: true,
      stats: {
        totalSuppliers,
        activeSuppliers,
        pendingKYC,
        totalOrders,
        pendingOrders,
        totalProducts,
        pendingProducts,
        // Convert Decimal → number here so it's safe to pass to Client Components
        totalRevenue: Number(revenueAgg._sum.totalAmount ?? 0),
      },
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}

// ============================================
// USER MANAGEMENT
// ============================================

export async function toggleUserRole(userId: string, newRole: "ADMIN" | "CUSTOMER" | "SUPPLIER") {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.role !== "ADMIN") throw new Error("Forbidden: Admins only");
    
    await prisma.user.update({
      where: { id: userId },
      data: { role: newRole }
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteUserAccount(userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (dbUser?.role !== "ADMIN") throw new Error("Forbidden: Admins only");

    // 1. Check if user is a supplier
    const supplier = await prisma.supplier.findUnique({ where: { userId } });
    if (supplier) {
      await prisma.product.deleteMany({ where: { supplierId: supplier.id } });
      await prisma.earningsTransaction.deleteMany({ where: { supplierId: supplier.id } });
      await prisma.withdrawalRequest.deleteMany({ where: { supplierId: supplier.id } });
      await prisma.supplier.delete({ where: { id: supplier.id } });
    }

    // 2. Delete Orders and OrderItems associated with user
    const userOrders = await prisma.order.findMany({ where: { userId } });
    const orderIds = userOrders.map(o => o.id);
    await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
    await prisma.order.deleteMany({ where: { userId } });

    // 3. Delete the user
    await prisma.user.delete({
      where: { id: userId }
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message || "Failed to delete user" };
  }
}
