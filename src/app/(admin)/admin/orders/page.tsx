import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import OrdersClient from './OrdersClient'

export const metadata = {
  title: 'Orders - Admin | Luxe',
}

export default async function AdminOrdersPage() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  // Fetch orders with pagination
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  return <OrdersClient initialOrders={orders || []} />
}
