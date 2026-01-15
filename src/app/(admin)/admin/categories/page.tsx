import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import CategoriesClient from './CategoriesClient'

export const metadata = {
  title: 'Categories - Admin | Luxe',
}

export default async function AdminCategoriesPage() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('name')

  return <CategoriesClient initialCategories={categories || []} />
}
