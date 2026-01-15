import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema for payment verification
const verifySchema = z.object({
  razorpay_order_id: z.string().min(1, 'Order ID is required'),
  razorpay_payment_id: z.string().min(1, 'Payment ID is required'),
  razorpay_signature: z.string().min(1, 'Signature is required'),
  dbOrderId: z.string().uuid('Invalid order ID'),
})

// Verify payment signature using HMAC SHA256
function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

// Fetch payment details from Razorpay for additional verification
async function fetchPaymentDetails(paymentId: string) {
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured')
  }

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

  const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch payment details')
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validation = verifySchema.safeParse(body)
    if (!validation.success) {
      console.error('Validation error:', validation.error.flatten())
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = validation.data

    // Get the secret key
    const keySecret = process.env.RAZORPAY_KEY_SECRET
    if (!keySecret) {
      console.error('Razorpay secret key not configured')
      return NextResponse.json(
        { error: 'Payment configuration error' },
        { status: 500 }
      )
    }

    // Verify the signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    )

    if (!isValidSignature) {
      console.error('Invalid payment signature for order:', dbOrderId)
      return NextResponse.json(
        { error: 'Payment verification failed - Invalid signature' },
        { status: 400 }
      )
    }

    console.log('Signature verified successfully for payment:', razorpay_payment_id)

    // Fetch payment details from Razorpay for additional verification
    let paymentDetails
    try {
      paymentDetails = await fetchPaymentDetails(razorpay_payment_id)
      console.log('Payment status from Razorpay:', paymentDetails.status)

      // Verify payment is actually captured/authorized
      if (!['captured', 'authorized'].includes(paymentDetails.status)) {
        console.error('Payment not captured:', paymentDetails.status)
        return NextResponse.json(
          { error: `Payment not successful. Status: ${paymentDetails.status}` },
          { status: 400 }
        )
      }
    } catch (fetchError) {
      console.error('Failed to fetch payment details:', fetchError)
      // Continue with signature verification if fetch fails
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    // Verify the order exists and is in pending state
    const { data: existingOrder, error: fetchOrderError } = await adminClient
      .from('orders')
      .select('id, payment_status, razorpay_order_id')
      .eq('id', dbOrderId)
      .single()

    if (fetchOrderError || !existingOrder) {
      console.error('Order not found:', dbOrderId)
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Verify the Razorpay order ID matches
    if (existingOrder.razorpay_order_id !== razorpay_order_id) {
      console.error('Order ID mismatch:', existingOrder.razorpay_order_id, razorpay_order_id)
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      )
    }

    // Prevent double processing
    if (existingOrder.payment_status === 'paid') {
      console.log('Order already paid:', dbOrderId)
      return NextResponse.json({ 
        success: true, 
        message: 'Payment already processed' 
      })
    }

    // Update order with payment details
    const { error: updateError } = await adminClient
      .from('orders')
      .update({
        razorpay_payment_id,
        razorpay_signature,
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dbOrderId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    // Decrement stock for each item after successful payment
    // First, get the order items
    const { data: orderData } = await adminClient
      .from('orders')
      .select('cart_items')
      .eq('id', dbOrderId)
      .single()

    if (orderData?.cart_items) {
      for (const item of orderData.cart_items as any[]) {
        // Get current stock
        const { data: product } = await adminClient
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single()

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
    }

    console.log('Order updated successfully:', dbOrderId)

    return NextResponse.json({ 
      success: true,
      message: 'Payment verified and order confirmed',
      orderId: dbOrderId,
    })
  } catch (error: any) {
    console.error('Error verifying payment:', error)
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    )
  }
}
