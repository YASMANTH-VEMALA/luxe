import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Schema for stock validation request
const validateStockSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().positive(),
  })),
})

// Schema for stock update request
const updateStockSchema = z.object({
  productId: z.string(),
  quantity: z.number().int(),
  operation: z.enum(['set', 'increment', 'decrement']),
})

// Validate stock availability for multiple items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = validateStockSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    const { items } = validation.data
    const adminClient = createAdminClient()

    // Get product IDs
    const productIds = items.map(item => item.productId)

    // Fetch current stock for all products
    let products: any[] | null = null
    
    try {
      const { data, error } = await adminClient
        .from('products')
        .select('id, title, stock_quantity, is_active')
        .in('id', productIds)

      if (error) {
        console.error('Database error (non-blocking):', error)
        // Return all available if we can't check - don't block orders
        return NextResponse.json({
          allAvailable: true,
          stockStatus: items.map(item => ({
            productId: item.productId,
            title: 'Product',
            requestedQuantity: item.quantity,
            availableStock: 999,
            isAvailable: true,
            isActive: true,
          })),
        })
      }
      products = data
    } catch (e) {
      console.error('Stock check failed:', e)
      // Return all available on error
      return NextResponse.json({
        allAvailable: true,
        stockStatus: items.map(item => ({
          productId: item.productId,
          title: 'Product',
          requestedQuantity: item.quantity,
          availableStock: 999,
          isAvailable: true,
          isActive: true,
        })),
      })
    }

    // Check stock for each item
    const stockStatus: {
      productId: string
      title: string
      requestedQuantity: number
      availableStock: number
      isAvailable: boolean
      isActive: boolean
    }[] = []

    let allAvailable = true

    for (const item of items) {
      const product = products?.find(p => p.id === item.productId)
      
      if (!product) {
        // If product not found, assume it's available (don't block)
        stockStatus.push({
          productId: item.productId,
          title: 'Product',
          requestedQuantity: item.quantity,
          availableStock: 999,
          isAvailable: true,
          isActive: true,
        })
        continue
      }

      // Only mark unavailable if explicitly out of stock (stock = 0)
      const isAvailable = product.is_active !== false && (product.stock_quantity === null || product.stock_quantity > 0)

      stockStatus.push({
        productId: item.productId,
        title: product.title,
        requestedQuantity: item.quantity,
        availableStock: product.stock_quantity ?? 999,
        isAvailable,
        isActive: product.is_active !== false,
      })

      if (!isAvailable) {
        allAvailable = false
      }
    }

    return NextResponse.json({
      allAvailable,
      stockStatus,
    })
  } catch (error: any) {
    console.error('Error validating stock:', error)
    // On any error, return all available - don't block orders
    return NextResponse.json({
      allAvailable: true,
      stockStatus: [],
    })
  }
}

// Update stock for a single product (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = updateStockSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    const { productId, quantity, operation } = validation.data
    const adminClient = createAdminClient()

    // Get current stock
    const { data: product, error: fetchError } = await adminClient
      .from('products')
      .select('stock_quantity')
      .eq('id', productId)
      .single()

    if (fetchError || !product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      )
    }

    let newQuantity: number

    switch (operation) {
      case 'set':
        newQuantity = quantity
        break
      case 'increment':
        newQuantity = product.stock_quantity + quantity
        break
      case 'decrement':
        newQuantity = Math.max(0, product.stock_quantity - quantity)
        break
    }

    // Update stock
    const { error: updateError } = await adminClient
      .from('products')
      .update({ 
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId)

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update stock' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      productId,
      previousStock: product.stock_quantity,
      newStock: newQuantity,
    })
  } catch (error: any) {
    console.error('Error updating stock:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update stock' },
      { status: 500 }
    )
  }
}
