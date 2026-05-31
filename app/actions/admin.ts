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
          business_contact: supplier.user.name || supplier.businessName,
          business_contact_mobile: supplier.phone,
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
        user: { select: { name: true, email: true, telegramId: true } },
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

// ── Shared helpers ────────────────────────────────────────────────────────────

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Unauthorized' }
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
  if (!dbUser || dbUser.role !== 'ADMIN') return { ok: false as const, error: 'Forbidden' }
  return { ok: true as const }
}

async function flwRefundByTxRef(txRef: string): Promise<{ ok: boolean; error?: string }> {
  const { FLW_SECRET_KEY } = await import('@/lib/flutterwave')
  const searchRes = await fetch(
    `https://api.flutterwave.com/v3/transactions?tx_ref=${encodeURIComponent(txRef)}`,
    { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
  )
  const searchJson = await searchRes.json()
  const flwTx = searchJson?.data?.[0]
  if (!flwTx?.id) {
    return { ok: false, error: 'Flutterwave transaction not found. Refund manually from the FLW dashboard.' }
  }
  const { initiateRefund } = await import('@/lib/flutterwave')
  await initiateRefund(String(flwTx.id))
  return { ok: true }
}

/**
 * Admin: cancel an UNPAID/PENDING order and restore stock.
 */
export async function cancelOrder(orderId: string) {
  try {
    const auth = await assertAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { telegramId: true } },
        items: { select: { productId: true, quantity: true } },
      },
    })
    if (!order) return { success: false, error: 'Order not found' }
    if (order.status === 'CANCELLED') return { success: false, error: 'Already cancelled' }
    if (order.paymentStatus === 'PAID') {
      return { success: false, error: 'Order is paid — use Refund & Cancel instead.' }
    }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    await notifyTelegram(
      order.user.telegramId,
      `❌ *Order Cancelled*\n\nYour order *#${order.orderNumber}* has been cancelled by the platform.\n\nNo payment was taken. Contact support if you have questions.`
    )

    revalidatePath('/admin/orders')
    return { success: true, message: `Order #${order.orderNumber} cancelled.` }
  } catch (error) {
    console.error('cancelOrder error:', error)
    return { success: false, error: 'Failed to cancel order' }
  }
}

/**
 * Admin: refund a PAID order via Flutterwave, mark CANCELLED + REFUNDED, restore stock.
 */
export async function refundOrder(orderId: string) {
  try {
    const auth = await assertAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: { select: { telegramId: true } },
        items: { select: { productId: true, quantity: true } },
      },
    })
    if (!order) return { success: false, error: 'Order not found' }
    if (order.paymentStatus !== 'PAID') {
      return { success: false, error: 'Order has not been paid — use Cancel instead.' }
    }
    if (order.status === 'CANCELLED') return { success: false, error: 'Already cancelled.' }
    if (order.status === 'DELIVERED') return { success: false, error: 'Cannot refund a delivered order.' }
    if (!order.paymentRef) return { success: false, error: 'No payment reference on this order.' }

    const refund = await flwRefundByTxRef(order.paymentRef)
    if (!refund.ok) return { success: false, error: refund.error }

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
      })
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    await notifyTelegram(
      order.user.telegramId,
      `💸 *Refund Initiated*\n\nYour payment for order *#${order.orderNumber}* has been refunded.\n\nThe amount will be returned to your original payment method within 3–5 business days.`
    )

    revalidatePath('/admin/orders')
    return { success: true, message: `Order #${order.orderNumber} refunded and cancelled.` }
  } catch (error: any) {
    console.error('refundOrder error:', error)
    return { success: false, error: error.message || 'Failed to refund order' }
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
// NOTIFICATIONS (Admin → Suppliers)
// ============================================

/**
 * Send a notification to a specific supplier or broadcast to all.
 */
export async function sendNotification(data: {
  title: string
  message: string
  supplierId?: string // omit for broadcast
}) {
  try {
    const auth = await assertAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    if (!data.title?.trim() || !data.message?.trim()) {
      return { success: false, error: 'Title and message are required.' }
    }

    await prisma.notification.create({
      data: {
        title: data.title.trim(),
        message: data.message.trim(),
        supplierId: data.supplierId ?? null,
        target: data.supplierId ? 'SUPPLIER' : 'ALL',
        hasRead: false,
      },
    })

    revalidatePath('/admin/notifications')
    return { success: true, message: data.supplierId ? 'Notification sent.' : 'Broadcast sent to all suppliers.' }
  } catch (error) {
    console.error('sendNotification error:', error)
    return { success: false, error: 'Failed to send notification' }
  }
}

export async function getAdminNotifications() {
  try {
    const notifications = await prisma.notification.findMany({
      include: { supplier: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return { success: true, notifications }
  } catch (error) {
    console.error('getAdminNotifications error:', error)
    return { success: false, error: 'Failed to fetch notifications' }
  }
}

// ============================================
// DELETE REQUESTS (Admin review)
// ============================================

export async function getDeleteRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  try {
    const requests = await prisma.deleteRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        product: { select: { name: true, imageUrls: true, isDeleted: true } },
        supplier: { select: { businessName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return { success: true, requests }
  } catch (error) {
    console.error('getDeleteRequests error:', error)
    return { success: false, error: 'Failed to fetch delete requests' }
  }
}

export async function approveDeleteRequest(requestId: string) {
  try {
    const auth = await assertAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    const req = await prisma.deleteRequest.findUnique({
      where: { id: requestId },
      include: { supplier: { include: { user: { select: { telegramId: true } } } } },
    })
    if (!req) return { success: false, error: 'Request not found' }
    if (req.status !== 'PENDING') return { success: false, error: 'Request already reviewed' }

    await prisma.$transaction(async (tx) => {
      // Soft-delete the product
      await tx.product.update({
        where: { id: req.productId },
        data: { isDeleted: true, isActive: false, isApproved: false },
      })
      // Mark request approved
      await tx.deleteRequest.update({
        where: { id: requestId },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      })
      // Notify supplier
      await tx.notification.create({
        data: {
          supplierId: req.supplierId,
          target: 'SUPPLIER',
          title: 'Delete Request Approved',
          message: `Your request to remove a product has been approved. The product has been taken off the store.`,
        },
      })
    })

    await notifyTelegram(
      req.supplier.user.telegramId,
      `✅ *Delete Request Approved*\n\nYour product removal request has been approved. The product has been taken off the store.`
    )

    revalidatePath('/admin/delete-requests')
    return { success: true, message: 'Delete request approved and product removed.' }
  } catch (error) {
    console.error('approveDeleteRequest error:', error)
    return { success: false, error: 'Failed to approve request' }
  }
}

export async function rejectDeleteRequest(requestId: string, adminNote: string) {
  try {
    const auth = await assertAdmin()
    if (!auth.ok) return { success: false, error: auth.error }

    if (!adminNote?.trim()) return { success: false, error: 'A rejection reason is required.' }

    const req = await prisma.deleteRequest.findUnique({
      where: { id: requestId },
      include: { supplier: { include: { user: { select: { telegramId: true } } } } },
    })
    if (!req) return { success: false, error: 'Request not found' }
    if (req.status !== 'PENDING') return { success: false, error: 'Request already reviewed' }

    await prisma.$transaction(async (tx) => {
      await tx.deleteRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED', adminNote: adminNote.trim(), reviewedAt: new Date() },
      })
      await tx.notification.create({
        data: {
          supplierId: req.supplierId,
          target: 'SUPPLIER',
          title: 'Delete Request Rejected',
          message: `Your product removal request was not approved.\n\nReason: ${adminNote.trim()}`,
        },
      })
    })

    await notifyTelegram(
      req.supplier.user.telegramId,
      `❌ *Delete Request Rejected*\n\nYour product removal request was not approved.\n\n*Reason:* ${adminNote.trim()}`
    )

    revalidatePath('/admin/delete-requests')
    return { success: true, message: 'Delete request rejected.' }
  } catch (error) {
    console.error('rejectDeleteRequest error:', error)
    return { success: false, error: 'Failed to reject request' }
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

    // Use a transaction to delete all Prisma data in the correct dependency order
    await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { userId } });

      if (supplier) {
        // Delete supplier-related data first (leaf nodes → parent)
        await tx.earningsTransaction.deleteMany({ where: { supplierId: supplier.id } });
        await tx.withdrawalRequest.deleteMany({ where: { supplierId: supplier.id } });

        // Delete order items for products belonging to this supplier, then the products
        const supplierProducts = await tx.product.findMany({
          where: { supplierId: supplier.id },
          select: { id: true },
        });
        const productIds = supplierProducts.map(p => p.id);
        if (productIds.length > 0) {
          await tx.orderItem.deleteMany({ where: { productId: { in: productIds } } });
        }
        await tx.product.deleteMany({ where: { supplierId: supplier.id } });
        await tx.supplier.delete({ where: { id: supplier.id } });
      }

      // Delete orders placed by this user (order items first)
      const userOrders = await tx.order.findMany({ where: { userId }, select: { id: true } });
      const orderIds = userOrders.map(o => o.id);
      if (orderIds.length > 0) {
        await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
      }
      await tx.order.deleteMany({ where: { userId } });

      // Finally delete the user row
      await tx.user.delete({ where: { id: userId } });
    });

    // Delete from Supabase Auth — this is the source of truth for login.
    // Must use the service-role client (admin API), not the anon client.
    // We create a separate admin client using the service role key.
    const { createClient: createAdminClient } = await import('@supabase/supabase-js');
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      // Log but don't fail — Prisma data is already cleaned up.
      // The user can no longer log in since their DB row is gone.
      console.warn('[deleteUserAccount] Supabase Auth delete failed:', authDeleteError.message);
    }

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error: any) {
    console.error('[deleteUserAccount]', error);
    return { success: false, error: error.message || "Failed to delete user" };
  }
}
