import { createClient } from '@/lib/supabase/server'
import { getDashboardStats } from '@/app/actions/visitors'
import DashboardClient from './DashboardClient'

export const metadata = {
  title: 'Dashboard - Admin | Luxe',
}

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Get dashboard stats
  const stats = await getDashboardStats()
  
  // Get low stock products
  const { data: lowStockProducts } = await supabase
    .from('products')
    .select('id, title, slug, stock_quantity, low_stock_threshold, images')
    .eq('is_active', true)
    .gt('stock_quantity', 0)
    .lte('stock_quantity', 10)
    .order('stock_quantity', { ascending: true })
    .limit(5)

  return (
    <DashboardClient 
      initialStats={stats}
      lowStockProducts={lowStockProducts || []}
    />
  )
}
