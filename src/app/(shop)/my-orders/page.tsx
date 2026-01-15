import { Metadata } from 'next'
import MyOrdersClient from './MyOrdersClient'

export const metadata: Metadata = {
  title: 'My Orders | Luxe',
  description: 'View your order history',
}

export default function MyOrdersPage() {
  return <MyOrdersClient />
}
