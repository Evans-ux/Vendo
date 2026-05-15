'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// SUPPLIER PROFILE
// ============================================

export async function getSupplierProfile() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
      include: {
        user: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    return { success: true, supplier }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    await prisma.supplier.update({
      where: { id: supplier.id },
      data,
    })

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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    const orders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              supplierId: supplier.id,
            },
          },
        },
        ...(status && { status: status as any }),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        items: {
          where: {
            product: {
              supplierId: supplier.id,
            },
          },
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return { success: true, orders }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { success: false, error: 'Failed to fetch orders' }
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: status as any },
    })

    revalidatePath('/supplier/orders')
    return { success: true, message: 'Order status updated' }
  } catch (error) {
    console.error('Error updating order status:', error)
    return { success: false, error: 'Failed to update order status' }
  }
}

// ============================================
// PRODUCTS MANAGEMENT
// ============================================

export async function getSupplierProducts() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    const products = await prisma.product.findMany({
      where: { supplierId: supplier.id },
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
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    // Calculate selling price (25% markup)
    const sellingPrice = Math.round(data.basePrice * 1.25 * 100) / 100

    await prisma.product.create({
      data: {
        ...data,
        sellingPrice,
        supplierId: supplier.id,
      },
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product created successfully' }
  } catch (error) {
    console.error('Error creating product:', error)
    return { success: false, error: 'Failed to create product' }
  }
}

export async function updateProduct(productId: string, data: any) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    // Recalculate selling price if basePrice changed
    if (data.basePrice) {
      data.sellingPrice = Math.round(data.basePrice * 1.25 * 100) / 100
    }

    await prisma.product.update({
      where: { id: productId },
      data,
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product updated successfully' }
  } catch (error) {
    console.error('Error updating product:', error)
    return { success: false, error: 'Failed to update product' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    await prisma.product.delete({
      where: { id: productId },
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product deleted successfully' }
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    const [totalProducts, totalOrders, pendingOrders, revenue] = await Promise.all([
      prisma.product.count({ where: { supplierId: supplier.id } }),
      prisma.order.count({
        where: {
          items: {
            some: {
              product: { supplierId: supplier.id },
            },
          },
        },
      }),
      prisma.order.count({
        where: {
          status: 'PENDING',
          items: {
            some: {
              product: { supplierId: supplier.id },
            },
          },
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
        revenue: revenue._sum.unitPrice || 0,
      },
    }
  } catch (error) {
    console.error('Error fetching supplier stats:', error)
    return { success: false, error: 'Failed to fetch stats' }
  }
}

export async function deleteProduct(productId: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

    // Verify product belongs to this supplier
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || product.supplierId !== supplier.id) {
      return { success: false, error: 'Product not found or unauthorized' }
    }

    // Delete product images from Supabase Storage
    if (product.imageUrls && product.imageUrls.length > 0) {
      const filePaths = product.imageUrls.map(url => {
        // Extract file path from URL
        const match = url.match(/product-images\/(.+)$/)
        return match ? match[1] : null
      }).filter(Boolean) as string[]

      if (filePaths.length > 0) {
        await supabase.storage
          .from('product-images')
          .remove(filePaths)
      }
    }

    // Delete product from database
    await prisma.product.delete({
      where: { id: productId },
    })

    revalidatePath('/supplier/products')
    return { success: true, message: 'Product deleted successfully' }
  } catch (error) {
    console.error('Error deleting product:', error)
    return { success: false, error: 'Failed to delete product' }
  }
}

export async function submitKYC(data: {
  kycDocUrl: string
  kycDocType: string
}) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const supplier = await prisma.supplier.findUnique({
      where: { userId: user.id },
    })

    if (!supplier) {
      return { success: false, error: 'Supplier not found' }
    }

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
