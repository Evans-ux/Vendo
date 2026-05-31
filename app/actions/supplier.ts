'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper — gets the DB supplier record for the currently logged-in user.
// All functions use email (from Supabase Auth) to find the DB user,
// then join to supplier. This matches the pattern used everywhere else.
async function getAuthSupplier() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { supabase, supplier: null, error: 'Not authenticated' }

  const dbUser = await prisma.user.findUnique({
    where: { email: user.email },
    include: { supplier: true },
  })

  if (!dbUser?.supplier) return { supabase, supplier: null, error: 'Supplier not found' }
  return { supabase, supplier: dbUser.supplier, error: null }
}

// ============================================
// SUPPLIER PROFILE
// ============================================

export async function getSupplierProfile() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    const full = await prisma.supplier.findUnique({
      where: { id: supplier.id },
      include: { user: true, _count: { select: { products: true } } },
    })

    return { success: true, supplier: full }
  } catch (error) {
    console.error('Error fetching supplier profile:', error)
    return { success: false, error: 'Failed to fetch profile' }
  }
}

export async function updateSupplierProfile(data: {
  businessName?: string
  phone?: string
  address?: string
  state?: string
  bio?: string
}) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    await prisma.supplier.update({ where: { id: supplier.id }, data })

    revalidatePath('/supplier/profile')
    return { success: true, message: 'Profile updated successfully' }
  } catch (error) {
    console.error('Error updating profile:', error)
    return { success: false, error: 'Failed to update profile' }
  }
}

// ============================================
// ORDERS MANAGEMENT
// ============================================

export async function getSupplierOrders(status?: string) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    const orders = await prisma.order.findMany({
      where: {
        items: { some: { product: { supplierId: supplier.id } } },
        ...(status && { status: status as any }),
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        items: {
          where: { product: { supplierId: supplier.id } },
          include: { product: true },
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

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    // Suppliers may only set PROCESSING or SHIPPED.
    // PENDING/CONFIRMED are set by the system on payment.
    // DELIVERED is set by the customer confirming receipt.
    // CANCELLED must go through supplierCancelOrder (requires a reason + refund logic).
    const ALLOWED: string[] = ['PROCESSING', 'SHIPPED']
    if (!ALLOWED.includes(status)) {
      return {
        success: false,
        error: `You can only mark an order as Processing or Shipped. Use the Cancel button to cancel.`,
      }
    }

    // Verify this order belongs to this supplier
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: { some: { product: { supplierId: supplier.id } } },
      },
    })
    if (!order) return { success: false, error: 'Order not found or unauthorized' }

    // Can only move to PROCESSING from CONFIRMED, and SHIPPED from PROCESSING
    if (status === 'PROCESSING' && order.status !== 'CONFIRMED') {
      return { success: false, error: 'Order must be CONFIRMED before marking as Processing.' }
    }
    if (status === 'SHIPPED' && !['CONFIRMED', 'PROCESSING'].includes(order.status)) {
      return { success: false, error: 'Order must be CONFIRMED or PROCESSING before marking as Shipped.' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    })

    revalidatePath('/supplier/orders')
    return { success: true, message: `Order marked as ${status}.` }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: 'Failed to update order status' }
  }
}

/**
 * Supplier cancels an order with a mandatory reason.
 * - If UNPAID: just cancel + restore stock, notify customer.
 * - If PAID: initiate Flutterwave refund, then cancel + restore stock, notify customer.
 * - DELIVERED orders cannot be cancelled.
 */
export async function supplierCancelOrder(orderId: string, reason: string) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    if (!reason?.trim()) return { success: false, error: 'A cancellation reason is required.' }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        items: { some: { product: { supplierId: supplier.id } } },
      },
      include: {
        user: { select: { telegramId: true } },
        items: { select: { productId: true, quantity: true } },
      },
    })
    if (!order) return { success: false, error: 'Order not found or unauthorized' }
    if (order.status === 'CANCELLED') return { success: false, error: 'Order is already cancelled.' }
    if (order.status === 'DELIVERED') {
      return { success: false, error: 'A delivered order cannot be cancelled.' }
    }

    // If paid, initiate refund first
    if (order.paymentStatus === 'PAID') {
      if (!order.paymentRef) {
        return { success: false, error: 'No payment reference found. Contact admin to process the refund manually.' }
      }

      const { FLW_SECRET_KEY } = await import('@/lib/flutterwave')
      const searchRes = await fetch(
        `https://api.flutterwave.com/v3/transactions?tx_ref=${encodeURIComponent(order.paymentRef)}`,
        { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
      )
      const searchJson = await searchRes.json()
      const flwTx = searchJson?.data?.[0]

      if (!flwTx?.id) {
        return {
          success: false,
          error: 'Could not find the payment on Flutterwave. Contact admin to process the refund manually.',
        }
      }

      const { initiateRefund } = await import('@/lib/flutterwave')
      await initiateRefund(String(flwTx.id))

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

      // Notify customer
      const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
      if (token && order.user.telegramId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: order.user.telegramId,
            text:
              `❌ *Order Cancelled by Supplier*\n\n` +
              `Your order *#${order.orderNumber}* has been cancelled.\n\n` +
              `*Reason:* ${reason}\n\n` +
              `💸 A full refund has been initiated and will be returned to your original payment method within 3–5 business days.\n\n` +
              `If you have questions, please contact support.`,
            parse_mode: 'Markdown',
          }),
        }).catch(() => {})
      }

      revalidatePath('/supplier/orders')
      return { success: true, message: 'Order cancelled and refund initiated.' }
    }

    // Unpaid — just cancel and restore stock
    await prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } })
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    })

    const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
    if (token && order.user.telegramId) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: order.user.telegramId,
          text:
            `❌ *Order Cancelled by Supplier*\n\n` +
            `Your order *#${order.orderNumber}* has been cancelled.\n\n` +
            `*Reason:* ${reason}\n\n` +
            `No payment was taken. If you have questions, please contact support.`,
          parse_mode: 'Markdown',
        }),
      }).catch(() => {})
    }

    revalidatePath('/supplier/orders')
    return { success: true, message: 'Order cancelled.' }
  } catch (error: any) {
    console.error('supplierCancelOrder error:', error)
    return { success: false, error: error.message || 'Failed to cancel order' }
  }
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

export async function getSupplierProducts() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    const products = await prisma.product.findMany({
      where: { supplierId: supplier.id, isDeleted: false },
      orderBy: { createdAt: 'desc' },
    })

    return { success: true, products }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { success: false, error: 'Failed to fetch products' }
  }
}

export async function createProduct(data: {
  name: string
  description?: string
  category?: string
  basePrice: number
  imageUrls: string[]
  sizes: any
  stock: number
  deliveryMethod?: 'SELF_DELIVERY' | 'PLATFORM_LOGISTICS' | 'DROPSHIP_HANDLED'
  logisticsFee?: number
}) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    // 10% markup
    const sellingPrice = Math.round(data.basePrice * 1.10 * 100) / 100

    await prisma.product.create({
      data: {
        supplierId: supplier.id,
        name: data.name,
        description: data.description,
        category: data.category,
        basePrice: data.basePrice,
        sellingPrice,
        imageUrls: data.imageUrls,
        sizes: data.sizes,
        stock: data.stock,
        deliveryMethod: data.deliveryMethod ?? 'SELF_DELIVERY',
        logisticsFee: data.logisticsFee ?? null,
        isApproved: false,
        isActive: true,
      },
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product created successfully' }
  } catch (error) {
    console.error('Error creating product:', error)
    return { success: false, error: 'Failed to create product' }
  }
}

export async function updateProduct(productId: string, data: {
  name?: string
  description?: string
  category?: string
  basePrice?: number
  stock?: number
  sizes?: any
  deliveryMethod?: 'SELF_DELIVERY' | 'PLATFORM_LOGISTICS' | 'DROPSHIP_HANDLED'
  logisticsFee?: number | null
  isActive?: boolean
}) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    // Verify ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    })
    if (!product || product.supplierId !== supplier.id) {
      return { success: false, error: 'Product not found or unauthorized' }
    }

    const hasOrders = product._count.orderItems > 0

    // Once a product has been ordered, only stock can be updated
    if (hasOrders) {
      if (Object.keys(data).some((k) => k !== 'stock' && k !== 'isActive')) {
        return {
          success: false,
          error: 'This product has been ordered. Only stock quantity can be updated.',
        }
      }
    }

    const updateData: any = { ...data }

    // Recalculate selling price at 10% if basePrice changed
    if (data.basePrice) {
      updateData.sellingPrice = Math.round(data.basePrice * 1.10 * 100) / 100
    }

    await prisma.product.update({ where: { id: productId }, data: updateData })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product updated successfully' }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, error: 'Failed to update product' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const { supabase, supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    // Verify ownership
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        orderItems: {
          include: { order: { select: { paymentStatus: true, status: true } } },
        },
      },
    })
    if (!product || product.supplierId !== supplier.id) {
      return { success: false, error: 'Product not found or unauthorized' }
    }

    // ── Fraud protection ──────────────────────────────────────────────────────
    // Block deletion if there are any orders that have been PAID but not yet
    // DELIVERED or CANCELLED. The supplier cannot delete a product after a
    // customer has already paid — that would be fraud.
    const blockedOrders = product.orderItems.filter(
      (item) =>
        item.order.paymentStatus === 'PAID' &&
        item.order.status !== 'DELIVERED' &&
        item.order.status !== 'CANCELLED'
    )
    if (blockedOrders.length > 0) {
      return {
        success: false,
        error:
          'This product has active paid orders that have not been delivered yet. ' +
          'You cannot delete it until all paid orders are fulfilled or cancelled by an admin.',
      }
    }

    // ── Soft-delete vs hard-delete ────────────────────────────────────────────
    // If the product has ANY order history (even unpaid/cancelled), soft-delete
    // it so the OrderItem foreign-key reference stays intact for audit purposes.
    // If it has never been ordered, hard-delete and clean up storage.
    const hasOrderHistory = product.orderItems.length > 0

    if (hasOrderHistory) {
      // Soft-delete: hide from all customer-facing surfaces but keep the row
      await prisma.product.update({
        where: { id: productId },
        data: { isDeleted: true, isActive: false, isApproved: false },
      })
      revalidatePath('/supplier/products')
      return { success: true, message: 'Product removed from your store.' }
    }

    // Hard-delete: no order history, safe to fully remove
    if (product.imageUrls.length > 0) {
      const filePaths = product.imageUrls
        .map((url) => url.match(/product-images\/(.+)$/)?.[1])
        .filter(Boolean) as string[]
      if (filePaths.length > 0) {
        await supabase.storage.from('product-images').remove(filePaths)
      }
    }

    await prisma.product.delete({ where: { id: productId } })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product deleted successfully.' }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: 'Failed to delete product' }
  }
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getSupplierStats() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    const [totalProducts, totalOrders, pendingOrders, revenue] = await Promise.all([
      prisma.product.count({ where: { supplierId: supplier.id } }),
      prisma.order.count({
        where: { items: { some: { product: { supplierId: supplier.id } } } },
      }),
      prisma.order.count({
        where: {
          status: 'PENDING',
          items: { some: { product: { supplierId: supplier.id } } },
        },
      }),
      prisma.orderItem.aggregate({
        _sum: { unitPrice: true },
        where: {
          product: { supplierId: supplier.id },
          order: { paymentStatus: 'PAID' },
        },
      }),
    ])

    return {
      success: true,
      stats: {
        totalProducts,
        totalOrders,
        pendingOrders,
        revenue: Number(revenue._sum.unitPrice ?? 0),
      },
    }
  } catch (error) {
    console.error('Error fetching supplier stats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}

// ============================================
// DELETE REQUESTS (products with order history)
// ============================================

/**
 * Supplier requests deletion of a product that has been ordered.
 * Admin must approve before the product is soft-deleted.
 */
export async function requestProductDelete(productId: string, reason: string) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    if (!reason?.trim()) return { success: false, error: 'A reason is required.' }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { _count: { select: { orderItems: true } } },
    })
    if (!product || product.supplierId !== supplier.id) {
      return { success: false, error: 'Product not found or unauthorized' }
    }
    if (product.isDeleted) return { success: false, error: 'Product is already deleted.' }

    // Check for an existing pending request
    const existing = await prisma.deleteRequest.findFirst({
      where: { productId, supplierId: supplier.id, status: 'PENDING' },
    })
    if (existing) {
      return { success: false, error: 'A delete request for this product is already pending admin review.' }
    }

    await prisma.deleteRequest.create({
      data: { productId, supplierId: supplier.id, reason: reason.trim() },
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Delete request submitted. Admin will review it shortly.' }
  } catch (error) {
    console.error('requestProductDelete error:', error)
    return { success: false, error: 'Failed to submit delete request' }
  }
}

// ============================================
// NOTIFICATIONS
// ============================================

export async function getSupplierNotifications() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error, notifications: [] }

    // Fetch targeted + broadcast notifications, newest first
    const notifications = await prisma.notification.findMany({
      where: {
        OR: [
          { supplierId: supplier.id },
          { target: 'ALL' },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return { success: true, notifications }
  } catch (error) {
    console.error('getSupplierNotifications error:', error)
    return { success: false, error: 'Failed to fetch notifications', notifications: [] }
  }
}

export async function markNotificationRead(notificationId: string) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        OR: [{ supplierId: supplier.id }, { target: 'ALL' }],
      },
      data: { hasRead: true },
    })

    revalidatePath('/supplier/dashboard')
    return { success: true }
  } catch (error) {
    console.error('markNotificationRead error:', error)
    return { success: false, error: 'Failed to mark as read' }
  }
}

export async function markAllNotificationsRead() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    await prisma.notification.updateMany({
      where: {
        OR: [{ supplierId: supplier.id }, { target: 'ALL' }],
        hasRead: false,
      },
      data: { hasRead: true },
    })

    revalidatePath('/supplier/dashboard')
    return { success: true }
  } catch (error) {
    console.error('markAllNotificationsRead error:', error)
    return { success: false, error: 'Failed to mark all as read' }
  }
}

export async function getUnreadNotificationCount() {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { count: 0 }

    const count = await prisma.notification.count({
      where: {
        OR: [{ supplierId: supplier.id }, { target: 'ALL' }],
        hasRead: false,
      },
    })

    return { count }
  } catch {
    return { count: 0 }
  }
}

// ============================================
// KYC
// ============================================

export async function submitKYC(data: { kycDocUrl: string; kycDocType: string }) {
  try {
    const { supplier, error } = await getAuthSupplier()
    if (error || !supplier) return { success: false, error }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data: {
        ...data,
        kycStatus: 'PENDING',
        kycSubmittedAt: new Date(),
        onboardingStep: 'KYC_SUBMITTED',
      },
    })

    revalidatePath('/supplier/kyc')
    return { success: true, message: 'KYC submitted successfully' }
  } catch (error) {
    console.error('Error submitting KYC:', error)
    return { success: false, error: 'Failed to submit KYC' }
  }
}
