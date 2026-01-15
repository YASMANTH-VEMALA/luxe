import { createClient } from '@supabase/supabase-js'

// IMPORTANT: This client uses the service role key and bypasses RLS
// ONLY use this server-side for admin operations
// NEVER import this file in client components

export async function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
