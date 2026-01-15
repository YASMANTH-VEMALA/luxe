import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// Server-only utilities for admin verification
// NEVER import in client components

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    console.log('isAdmin: No user found')
    return false
  }
  
  console.log('isAdmin: Checking user:', user.id, user.email)
  
  // Use admin client to check admin_users table (bypasses RLS)
  const adminSupabase = await createAdminClient()
  
  const { data: adminUser, error } = await adminSupabase
    .from('admin_users')
    .select('id, role, user_id')
    .eq('user_id', user.id)
    .single()
  
  console.log('isAdmin: Query result:', { adminUser, error })
  
  if (error || !adminUser) return false
  
  return true
}

export async function getAdminUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const adminSupabase = await createAdminClient()
  
  const { data: adminUser } = await adminSupabase
    .from('admin_users')
    .select('id, role, email')
    .eq('user_id', user.id)
    .single()
  
  return adminUser
}

export async function requireAdmin() {
  const admin = await isAdmin()
  
  if (!admin) {
    redirect('/unauthorized')
  }
}

export async function requireSuperAdmin() {
  const adminUser = await getAdminUser()
  
  if (!adminUser || adminUser.role !== 'super_admin') {
    redirect('/unauthorized')
  }
}
