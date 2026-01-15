import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import PincodesClient from './PincodesClient'

export const metadata = {
  title: 'Pincodes - Admin | Luxe',
}

export default async function AdminPincodesPage() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  const { data: pincodes } = await supabase
    .from('pincodes')
    .select('*')
    .order('pincode')

  return <PincodesClient initialPincodes={pincodes || []} />
}
