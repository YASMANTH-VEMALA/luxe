import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json()

    if (!phone || phone.length !== 10) {
      return NextResponse.json(
        { error: 'Valid 10-digit phone number is required' },
        { status: 400 }
      )
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient()

    const { data: orders, error } = await adminClient
      .from('orders')
      .select('*')
      .eq('guest_phone', phone)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching orders by phone:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    return NextResponse.json({ orders: orders || [] })
  } catch (error) {
    console.error('Orders fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
