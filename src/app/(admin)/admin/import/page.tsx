import { requireAdmin } from '@/lib/auth/admin'
import ImportProductsClient from './ImportProductsClient'

export default async function ImportProductsPage() {
  await requireAdmin()
  return <ImportProductsClient />
}
