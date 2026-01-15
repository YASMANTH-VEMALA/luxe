'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import { z } from 'zod'

// Rate limiting (simple in-memory)
const rateLimits = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit: number = 30, windowMs: number = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimits.get(userId)
  
  if (!userLimit || now > userLimit.resetTime) {
    rateLimits.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (userLimit.count >= limit) {
    return false
  }
  
  userLimit.count++
  return true
}

// Product schemas
const productSchema = z.object({
  title: z.string().min(2).max(255),
  description: z.string().max(5000).optional(),
  category: z.string().min(1),
  price: z.number().positive().max(99999900),
  sale_price: z.number().positive().max(99999900).nullable().optional(),
  images: z.array(z.string().url()).min(1),
  sizes: z.array(z.string()).nullable().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  stock_quantity: z.number().int().min(0).default(100),
  low_stock_threshold: z.number().int().min(0).default(5),
  show_stock_count: z.boolean().default(true),
  fake_viewers: z.number().int().min(0).default(0),
  fake_sold_count: z.number().int().min(0).default(0),
})

// Generate slug
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50)
  const random = Math.random().toString(36).substring(2, 8)
  return `${base}-${random}`
}

// ============================================
// PRODUCT ACTIONS
// ============================================

export async function createProduct(formData: FormData) {
  await requireAdmin()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !checkRateLimit(user.id)) {
    return { error: 'Rate limit exceeded. Please try again later.' }
  }

  try {
    // Parse form data
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      category: formData.get('category') as string,
      price: parseInt(formData.get('price') as string) * 100, // Convert to paise
      sale_price: formData.get('sale_price') 
        ? parseInt(formData.get('sale_price') as string) * 100 
        : null,
      images: JSON.parse(formData.get('images') as string || '[]'),
      sizes: formData.get('sizes') 
        ? JSON.parse(formData.get('sizes') as string) 
        : null,
      is_active: formData.get('is_active') === 'true',
      is_featured: formData.get('is_featured') === 'true',
      stock_quantity: parseInt(formData.get('stock_quantity') as string || '100'),
      low_stock_threshold: parseInt(formData.get('low_stock_threshold') as string || '5'),
      show_stock_count: formData.get('show_stock_count') === 'true',
      fake_viewers: parseInt(formData.get('fake_viewers') as string || '0'),
      fake_sold_count: parseInt(formData.get('fake_sold_count') as string || '0'),
    }

    const validation = productSchema.safeParse(rawData)
    
    if (!validation.success) {
      return { error: 'Invalid input', details: validation.error.flatten() }
    }

    const slug = generateSlug(validation.data.title)

    const { data, error } = await supabase
      .from('products')
      .insert({
        ...validation.data,
        slug,
      })
      .select()
      .single()

    if (error) {
      console.error('Product creation error:', error)
      return { error: 'Failed to create product' }
    }

    revalidatePath('/admin/products')
    revalidatePath('/products')
    revalidatePath('/')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error creating product:', error)
    return { error: 'Something went wrong' }
  }
}

export async function updateProduct(productId: string, formData: FormData) {
  await requireAdmin()
  
  if (!z.string().uuid().safeParse(productId).success) {
    return { error: 'Invalid product ID' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !checkRateLimit(user.id)) {
    return { error: 'Rate limit exceeded' }
  }

  try {
    const rawData = {
      title: formData.get('title') as string,
      description: formData.get('description') as string || undefined,
      category: formData.get('category') as string,
      price: parseInt(formData.get('price') as string) * 100,
      sale_price: formData.get('sale_price') 
        ? parseInt(formData.get('sale_price') as string) * 100 
        : null,
      images: JSON.parse(formData.get('images') as string || '[]'),
      sizes: formData.get('sizes') 
        ? JSON.parse(formData.get('sizes') as string) 
        : null,
      is_active: formData.get('is_active') === 'true',
      is_featured: formData.get('is_featured') === 'true',
      stock_quantity: parseInt(formData.get('stock_quantity') as string || '100'),
      low_stock_threshold: parseInt(formData.get('low_stock_threshold') as string || '5'),
      show_stock_count: formData.get('show_stock_count') === 'true',
      fake_viewers: parseInt(formData.get('fake_viewers') as string || '0'),
      fake_sold_count: parseInt(formData.get('fake_sold_count') as string || '0'),
    }

    const validation = productSchema.safeParse(rawData)
    
    if (!validation.success) {
      return { error: 'Invalid input', details: validation.error.flatten() }
    }

    const { data, error } = await supabase
      .from('products')
      .update(validation.data)
      .eq('id', productId)
      .select()
      .single()

    if (error) {
      return { error: 'Failed to update product' }
    }

    revalidatePath('/admin/products')
    revalidatePath(`/products/${data.slug}`)
    revalidatePath('/products')
    revalidatePath('/')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error updating product:', error)
    return { error: 'Something went wrong' }
  }
}

export async function deleteProduct(productId: string) {
  await requireAdmin()
  
  if (!z.string().uuid().safeParse(productId).success) {
    return { error: 'Invalid product ID' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) {
    return { error: 'Failed to delete product' }
  }

  revalidatePath('/admin/products')
  revalidatePath('/products')
  revalidatePath('/')
  
  return { success: true }
}

// ============================================
// ORDER ACTIONS
// ============================================

const orderStatusSchema = z.object({
  orderId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']),
})

export async function updateOrderStatus(formData: FormData) {
  await requireAdmin()
  
  const rawData = {
    orderId: formData.get('orderId') as string,
    status: formData.get('status') as string,
  }

  const validation = orderStatusSchema.safeParse(rawData)
  
  if (!validation.success) {
    return { error: 'Invalid input' }
  }

  const supabase = await createClient()
  
  // If cancelling, first get the order to check its current status and cart items
  if (validation.data.status === 'cancelled') {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('status, cart_items, payment_status')
      .eq('id', validation.data.orderId)
      .single()

    if (orderError || !order) {
      return { error: 'Order not found' }
    }

    // Only allow cancellation from certain statuses
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return { error: 'Cannot cancel this order' }
    }

    // Restore stock for each item in the order
    // Only restore stock if payment was completed or it was a COD order
    if (order.cart_items && Array.isArray(order.cart_items)) {
      for (const item of order.cart_items as Array<{ productId: string; quantity: number }>) {
        // Increment stock back
        const { error: stockError } = await supabase.rpc('increment_stock', {
          p_product_id: item.productId,
          p_quantity: item.quantity
        })
        
        // If RPC doesn't exist, fallback to manual update
        if (stockError && stockError.message.includes('function increment_stock')) {
          const { data: product } = await supabase
            .from('products')
            .select('stock_quantity')
            .eq('id', item.productId)
            .single()
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock_quantity: (product.stock_quantity || 0) + item.quantity })
              .eq('id', item.productId)
          }
        }
      }
    }
  }
  
  const updateData: Record<string, any> = { status: validation.data.status }
  
  if (validation.data.status === 'shipped') {
    updateData.shipped_at = new Date().toISOString()
  } else if (validation.data.status === 'delivered') {
    updateData.delivered_at = new Date().toISOString()
  } else if (validation.data.status === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', validation.data.orderId)

  if (error) {
    return { error: 'Failed to update order' }
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${validation.data.orderId}`)
  
  return { success: true }
}

export async function updateOrderTracking(formData: FormData) {
  await requireAdmin()
  
  const orderId = formData.get('orderId') as string
  const trackingNumber = formData.get('trackingNumber') as string
  const trackingUrl = formData.get('trackingUrl') as string

  if (!z.string().uuid().safeParse(orderId).success) {
    return { error: 'Invalid order ID' }
  }

  const supabase = await createClient()
  
  const { error } = await supabase
    .from('orders')
    .update({
      tracking_number: trackingNumber || null,
      tracking_url: trackingUrl || null,
    })
    .eq('id', orderId)

  if (error) {
    return { error: 'Failed to update tracking' }
  }

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  
  return { success: true }
}

// ============================================
// CATEGORY ACTIONS
// ============================================

export async function createCategory(formData: FormData) {
  await requireAdmin()
  
  const name = formData.get('name') as string
  const description = formData.get('description') as string
  
  if (!name || name.length < 2) {
    return { error: 'Invalid category name' }
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      name,
      slug,
      description: description || null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Category already exists' }
    }
    return { error: 'Failed to create category' }
  }

  revalidatePath('/admin/categories')
  revalidatePath('/products')
  
  return { success: true, data }
}

export async function deleteCategory(categoryId: string) {
  await requireAdmin()
  
  if (!z.string().uuid().safeParse(categoryId).success) {
    return { error: 'Invalid category ID' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    return { error: 'Failed to delete category' }
  }

  revalidatePath('/admin/categories')
  
  return { success: true }
}

// ============================================
// PINCODE ACTIONS
// ============================================

export async function createPincode(formData: FormData) {
  await requireAdmin()
  
  const pincode = formData.get('pincode') as string
  const city = formData.get('city') as string
  const state = formData.get('state') as string
  const deliveryDays = parseInt(formData.get('deliveryDays') as string || '5')
  const isCodAvailable = formData.get('isCodAvailable') === 'true'
  
  if (!pincode || pincode.length !== 6) {
    return { error: 'Invalid pincode' }
  }

  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('pincodes')
    .insert({
      pincode,
      city: city || null,
      state: state || null,
      delivery_days: deliveryDays,
      is_cod_available: isCodAvailable,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: 'Pincode already exists' }
    }
    return { error: 'Failed to add pincode' }
  }

  revalidatePath('/admin/pincodes')
  
  return { success: true, data }
}

export async function deletePincode(pincodeId: string) {
  await requireAdmin()
  
  if (!z.string().uuid().safeParse(pincodeId).success) {
    return { error: 'Invalid pincode ID' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('pincodes')
    .delete()
    .eq('id', pincodeId)

  if (error) {
    return { error: 'Failed to delete pincode' }
  }

  revalidatePath('/admin/pincodes')
  
  return { success: true }
}

// ============================================
// IMAGE UPLOAD ACTIONS
// ============================================

export async function uploadProductImage(formData: FormData) {
  await requireAdmin()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !checkRateLimit(user.id, 20, 60000)) {
    return { error: 'Rate limit exceeded. Please try again later.' }
  }

  try {
    const file = formData.get('file') as File
    
    if (!file) {
      return { error: 'No file provided' }
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' }
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      return { error: 'File too large. Maximum size is 5MB.' }
    }

    // Generate unique filename
    const ext = file.name.split('.').pop()
    const filename = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (error) {
      console.error('Upload error:', error)
      return { error: 'Failed to upload image. Please try again.' }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(data.path)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Error uploading image:', error)
    return { error: 'Something went wrong' }
  }
}

export async function deleteProductImage(imageUrl: string) {
  await requireAdmin()
  
  const supabase = await createClient()

  try {
    // Extract path from URL
    const url = new URL(imageUrl)
    const pathMatch = url.pathname.match(/\/product-images\/(.+)$/)
    
    if (!pathMatch) {
      return { error: 'Invalid image URL' }
    }

    const filePath = pathMatch[1]

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      return { error: 'Failed to delete image' }
    }

    return { success: true }
  } catch (error) {
    console.error('Error deleting image:', error)
    return { error: 'Something went wrong' }
  }
}

// ============================================
// PRODUCT REVIEW ACTIONS (Admin-created reviews)
// ============================================

const reviewSchema = z.object({
  product_id: z.string().uuid(),
  reviewer_name: z.string().min(2).max(100),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(5).max(1000),
  is_verified: z.boolean().default(true),
})

export async function createProductReview(formData: FormData) {
  await requireAdmin()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user || !checkRateLimit(user.id)) {
    return { error: 'Rate limit exceeded' }
  }

  try {
    const rawData = {
      product_id: formData.get('product_id') as string,
      reviewer_name: formData.get('reviewer_name') as string,
      rating: parseInt(formData.get('rating') as string),
      comment: formData.get('comment') as string,
      is_verified: formData.get('is_verified') === 'true',
    }

    const validation = reviewSchema.safeParse(rawData)
    
    if (!validation.success) {
      return { error: 'Invalid input', details: validation.error.flatten() }
    }

    const { data, error } = await supabase
      .from('product_reviews')
      .insert({
        ...validation.data,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      console.error('Review creation error:', error)
      return { error: 'Failed to create review' }
    }

    // Get product slug for revalidation
    const { data: product } = await supabase
      .from('products')
      .select('slug')
      .eq('id', validation.data.product_id)
      .single()

    if (product) {
      revalidatePath(`/products/${product.slug}`)
    }
    revalidatePath('/admin/products')
    
    return { success: true, data }
  } catch (error) {
    console.error('Error creating review:', error)
    return { error: 'Something went wrong' }
  }
}

export async function deleteProductReview(reviewId: string) {
  await requireAdmin()
  
  if (!z.string().uuid().safeParse(reviewId).success) {
    return { error: 'Invalid review ID' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('product_reviews')
    .delete()
    .eq('id', reviewId)

  if (error) {
    return { error: 'Failed to delete review' }
  }

  revalidatePath('/admin/products')
  
  return { success: true }
}

export async function getProductReviews(productId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('product_reviews')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })

  if (error) {
    return { error: 'Failed to fetch reviews', data: [] }
  }

  return { data: data || [] }
}
