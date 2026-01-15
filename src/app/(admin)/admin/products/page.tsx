import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import ProductsClient from './ProductsClient'

export const metadata = {
  title: 'Products - Admin | Luxe',
}

export default async function AdminProductsPage() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  // Fetch products
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false })
  
  // Fetch categories for the dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return (
    <ProductsClient 
      initialProducts={products || []} 
      categories={categories || []} 
    />
  )
}
