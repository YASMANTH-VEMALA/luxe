import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { seedProductsFromAPIs, clearImportedProducts, getImportedProductsCount } from '@/lib/productSeeder'

// GET - Get imported products count
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminClient = createAdminClient()
    const { data: admin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const count = await getImportedProductsCount()
    return NextResponse.json({ count })
  } catch (error) {
    console.error('Get count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Seed products from APIs
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminClient = createAdminClient()
    const { data: admin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    console.log('Starting product import...')
    const result = await seedProductsFromAPIs()
    console.log('Import complete:', result)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Clear imported products
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if admin
    const adminClient = createAdminClient()
    const { data: admin } = await adminClient
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const result = await clearImportedProducts()
    return NextResponse.json(result)
  } catch (error) {
    console.error('Clear error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
