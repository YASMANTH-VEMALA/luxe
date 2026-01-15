import { requireAdmin } from '@/lib/auth/admin'
import AdminUsersClient from './AdminUsersClient'

export default async function AdminUsersPage() {
  await requireAdmin()
  
  return <AdminUsersClient />
}
