'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

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
      include: { user: { select: { email: true, name: true } } },
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
    // Approve the supplier and activate their account
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'APPROVED',
        kycReviewedAt: new Date(),
        isActive: true,
        onboardingStep: 'COMPLETED',
      },
    })

    // Approve all products this supplier has uploaded
    await prisma.product.updateMany({
      where: { supplierId },
      data: { isApproved: true },
    })

    // Upgrade the user's role to SUPPLIER
    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } })
    if (supplier) {
      await prisma.user.update({
        where: { id: supplier.userId },
        data: { role: 'SUPPLIER' },
      })
    }

    revalidatePath('/admin/kyc')
    return { success: true, message: 'Supplier verified and all products approved.' }
  } catch (error) {
    console.error('Error approving KYC:', error)
    return { success: false, error: 'Failed to approve KYC' }
  }
}

export async function rejectKYC(supplierId: string, reason: string) {
  try {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        kycStatus: 'REJECTED',
        kycRejectionReason: reason,
        kycReviewedAt: new Date(),
      },
    })
    revalidatePath('/admin/kyc')
    return { success: true, message: 'KYC rejected' }
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
