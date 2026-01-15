import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for order creation
const orderSchema = z.object({
  amount: z.number().positive(),
  userId: z.string().uuid().optional().nullable(),
  contact: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    phone: z.string().length(10, 'Phone must be 10 digits'),
    email: z.string().email().optional().or(z.literal('')),
  }),
  address: z.object({
    addressLine1: z.string().min(5, 'Address must be at least 5 characters'),
    addressLine2: z.string().optional(),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().length(6, 'Pincode must be 6 digits'),
  }),
  items: z.array(z.object({
    productId: z.string(),
    title: z.string(),
    price: z.number(),
    sale_price: z.number().nullable(),
    image: z.string(),
    quantity: z.number().positive(),
    size: z.string().optional(),
  })).min(1, 'Cart cannot be empty'),
})

// Create Razorpay order using direct API call (more reliable than SDK)
async function createRazorpayOrder(amount: number, receipt: string, notes: Record<string, string>) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured')
  }

  // Use Basic Auth with Razorpay API
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amount, // Amount in paise
      currency: 'INR',
      receipt: receipt,
      notes: notes,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    console.error('Razorpay API Error:', data)
    throw new Error(data.error?.description || 'Failed to create Razorpay order')
  }

  return data
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = orderSchema.safeParse(body)
    if (!validation.success) {
      console.error('Validation error:', validation.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { contact, address, items, userId } = validation.data

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Try to validate stock availability (soft validation - don't block on errors)
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
    if (products && products.length > 0) {
      for (const item of items) {
        const product = products.find(p => p.id === item.productId)
        
        // Skip validation for products not found
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

    // Generate unique order number
    const orderNumber = `LUX${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Calculate totals
    const subtotal = items.reduce((sum, item) => {
      const price = item.sale_price ?? item.price
      return sum + (price * item.quantity)
    }, 0)
    
    const FREE_SHIPPING_MIN = 49900 // ₹499 in paise
    const SHIPPING_CHARGE = 4900 // ₹49 in paise
    const shippingCharge = subtotal >= FREE_SHIPPING_MIN ? 0 : SHIPPING_CHARGE
    const totalAmount = subtotal + shippingCharge

    // Create order in database first
    const { data: dbOrder, error: dbError } = await adminClient
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
        cod_charges: 0,
        total_amount: totalAmount,
        payment_method: 'razorpay',
        payment_status: 'pending',
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to create order in database' },
        { status: 500 }
      )
    }

    console.log('Order created in DB:', dbOrder.id, orderNumber)

    // Create Razorpay order
    try {
      const razorpayOrder = await createRazorpayOrder(
        totalAmount,
        dbOrder.id,
        {
          orderNumber: orderNumber,
          dbOrderId: dbOrder.id,
          customerName: contact.name,
          customerPhone: contact.phone,
        }
      )

      console.log('Razorpay order created:', razorpayOrder.id)

      // Update order with Razorpay order ID
      await adminClient
        .from('orders')
        .update({ razorpay_order_id: razorpayOrder.id })
        .eq('id', dbOrder.id)

      return NextResponse.json({
        success: true,
        orderId: razorpayOrder.id,
        dbOrderId: dbOrder.id,
        orderNumber: orderNumber,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      })
    } catch (razorpayError: any) {
      // If Razorpay fails, delete the database order
      console.error('Razorpay error:', razorpayError.message)
      
      await adminClient
        .from('orders')
        .delete()
        .eq('id', dbOrder.id)

      return NextResponse.json(
        { error: razorpayError.message || 'Failed to create payment order' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Error in create-order:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create order' },
      { status: 500 }
    )
  }
}
