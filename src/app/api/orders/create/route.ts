import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const orderSchema = z.object({
  contact: z.object({
    name: z.string().min(2),
    phone: z.string().length(10),
    email: z.string().email().optional().or(z.literal('')),
  }),
  address: z.object({
    addressLine1: z.string().min(5),
    addressLine2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    pincode: z.string().length(6),
  }),
  items: z.array(z.object({
    productId: z.string(),
    title: z.string(),
    price: z.number(),
    sale_price: z.number().nullable(),
    image: z.string(),
    quantity: z.number().positive(),
    size: z.string().optional(),
  })),
  paymentMethod: z.enum(['cod', 'razorpay']),
  subtotal: z.number(),
  shippingCharge: z.number(),
  codCharge: z.number(),
  total: z.number(),
  userId: z.string().uuid().optional().nullable(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = orderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { contact, address, items, paymentMethod, subtotal, shippingCharge, codCharge, total, userId } = validation.data
    
    // Verify COD eligibility - minimum order amount
    if (paymentMethod === 'cod') {
      if (subtotal < 50000) { // ₹500 minimum for COD
        return NextResponse.json(
          { error: 'COD is only available for orders above ₹500' },
          { status: 400 }
        )
      }
      // COD available all over India
    }

    // Create order using admin client to bypass RLS
    const adminClient = createAdminClient()

    // Try to validate stock availability before creating order (soft validation)
    const productIds = items.map(item => item.productId)
    let products: any[] | null = null
    
    try {
      const { data, error: stockError } = await adminClient
        .from('products')
        .select('id, title, stock_quantity, is_active')
        .in('id', productIds)

      if (stockError) {
        console.error('Stock check error (non-blocking):', stockError)
        // Continue with order - don't block on stock check failures
      } else {
        products = data
      }
    } catch (e) {
      console.error('Stock validation failed (non-blocking):', e)
      // Continue with order
    }

    // Only do stock validation if we successfully fetched products
    // Skip validation if products fetch failed - let order through
    if (products && products.length > 0) {
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        
        // Skip validation for products not found - they might still exist
        if (!product) {
          continue
        }

        // Only block if product is explicitly inactive
        if (product.is_active === false) {
          return NextResponse.json(
            { error: `Product is no longer available: ${item.title}` },
            { status: 400 }
          )
        }

        // Only block if stock is explicitly 0 or less
        if (product.stock_quantity !== null && product.stock_quantity <= 0) {
          return NextResponse.json(
            { 
              error: `${item.title} is currently out of stock.`,
              outOfStock: true,
              productId: item.productId,
              availableStock: 0,
            },
            { status: 400 }
          )
        }
      }
    }

    // Generate order number
    const orderNumber = `LUX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    
    const { data: order, error } = await adminClient
      .from('orders')
      .insert({
        order_number: orderNumber,
        user_id: userId || null,
        guest_name: contact.name,
        guest_phone: contact.phone,
        guest_email: contact.email || null,
        shipping_address: {
          fullName: contact.name,
          phone: contact.phone,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2 || '',
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        cart_items: items,
        subtotal,
        shipping_charges: shippingCharge,
        cod_charges: codCharge,
        total_amount: total,
        payment_method: paymentMethod,
        payment_status: paymentMethod === 'cod' ? 'pending' : 'pending',
        status: paymentMethod === 'cod' ? 'confirmed' : 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      )
    }

    // Decrement stock for each item after successful order creation
    for (const item of items) {
      const product = products?.find(p => p.id === item.productId)
      if (product) {
        await adminClient
          .from('products')
          .update({ 
            stock_quantity: Math.max(0, product.stock_quantity - item.quantity),
            updated_at: new Date().toISOString(),
          })
          .eq('id', item.productId)
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      orderNumber: order.order_number,
    })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}
