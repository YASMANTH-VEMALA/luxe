import { Metadata } from 'next'
import TrackOrderClient from './TrackOrderClient'

export const metadata: Metadata = {
  title: 'Track Order | Luxe',
  description: 'Track your order status',
}

export default function TrackOrderPage() {
  return <TrackOrderClient />
}
