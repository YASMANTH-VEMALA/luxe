import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'

const updateStatusSchema = z.object({
  dbOrderId: z.string().uuid(),
  status: z.enum(['pending', 'failed', 'cancelled']),
  razorpayOrderId: z.string().optional(),
  errorCode: z.string().optional(),
  errorDescription: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input' },
        { status: 400 }
      )
    }

    const { dbOrderId, status, razorpayOrderId, errorCode, errorDescription } = validation.data

    const adminClient = createAdminClient()

    // Verify the order exists
    const { data: existingOrder, error: fetchError } = await adminClient
      .from('orders')
      .select('id, payment_status, razorpay_order_id')
      .eq('id', dbOrderId)
      .single()

    if (fetchError || !existingOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // If razorpayOrderId provided, verify it matches
    if (razorpayOrderId && existingOrder.razorpay_order_id !== razorpayOrderId) {
      return NextResponse.json(
        { error: 'Order ID mismatch' },
        { status: 400 }
      )
    }

    // Don't update if already paid
    if (existingOrder.payment_status === 'paid') {
      return NextResponse.json({
        success: true,
        message: 'Order already paid',
      })
    }

    // Update order status
    const updateData: Record<string, any> = {
      payment_status: status,
      updated_at: new Date().toISOString(),
    }

    // If failed, also update order status and store error details
    if (status === 'failed') {
      updateData.status = 'cancelled'
      if (errorCode || errorDescription) {
        updateData.notes = JSON.stringify({
          payment_error: {
            code: errorCode,
            description: errorDescription,
            failed_at: new Date().toISOString(),
          }
        })
      }
    }

    const { error: updateError } = await adminClient
      .from('orders')
      .update(updateData)
      .eq('id', dbOrderId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order' },
        { status: 500 }
      )
    }

    console.log(`Order ${dbOrderId} status updated to ${status}`)

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${status}`,
    })
  } catch (error: any) {
    console.error('Error updating payment status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update status' },
      { status: 500 }
    )
  }
}
