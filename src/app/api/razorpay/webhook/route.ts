import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/server'

// Razorpay Webhook Events
type WebhookEvent = {
  event: string
  payload: {
    payment?: {
      entity: {
        id: string
        order_id: string
        status: string
        amount: number
        notes?: Record<string, string>
      }
    }
    order?: {
      entity: {
        id: string
        status: string
        amount: number
        notes?: Record<string, string>
      }
    }
  }
}

// Verify webhook signature
function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('x-razorpay-signature')
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    // If webhook secret is configured, verify signature
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(body, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 400 }
        )
      }
    }

    const event: WebhookEvent = JSON.parse(body)
    console.log('Razorpay webhook event:', event.event)

    const adminClient = createAdminClient()

    switch (event.event) {
      case 'payment.captured': {
        // Payment was successful
        const payment = event.payload.payment?.entity
        if (!payment) break

        const dbOrderId = payment.notes?.dbOrderId

        if (dbOrderId) {
          await adminClient
            .from('orders')
            .update({
              razorpay_payment_id: payment.id,
              payment_status: 'paid',
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbOrderId)
            .eq('razorpay_order_id', payment.order_id)

          console.log(`Payment captured for order ${dbOrderId}`)
        }
        break
      }

      case 'payment.failed': {
        // Payment failed
        const payment = event.payload.payment?.entity
        if (!payment) break

        const dbOrderId = payment.notes?.dbOrderId

        if (dbOrderId) {
          await adminClient
            .from('orders')
            .update({
              payment_status: 'failed',
              status: 'cancelled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbOrderId)
            .eq('razorpay_order_id', payment.order_id)

          console.log(`Payment failed for order ${dbOrderId}`)
        }
        break
      }

      case 'order.paid': {
        // Order was paid (alternative event)
        const order = event.payload.order?.entity
        if (!order) break

        const dbOrderId = order.notes?.dbOrderId

        if (dbOrderId) {
          await adminClient
            .from('orders')
            .update({
              payment_status: 'paid',
              status: 'confirmed',
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbOrderId)
            .eq('razorpay_order_id', order.id)

          console.log(`Order paid via webhook: ${dbOrderId}`)
        }
        break
      }

      case 'refund.created':
      case 'refund.processed': {
        // Handle refunds
        const payment = event.payload.payment?.entity
        if (!payment) break

        const dbOrderId = payment.notes?.dbOrderId

        if (dbOrderId) {
          await adminClient
            .from('orders')
            .update({
              payment_status: 'refunded',
              updated_at: new Date().toISOString(),
            })
            .eq('id', dbOrderId)

          console.log(`Refund processed for order ${dbOrderId}`)
        }
        break
      }

      default:
        console.log('Unhandled webhook event:', event.event)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
