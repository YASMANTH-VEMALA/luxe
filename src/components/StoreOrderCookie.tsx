'use client'

import { useEffect } from 'react'
import { storeOrder, OrderCookieData } from '@/lib/orderCookies'

interface StoreOrderCookieProps {
  order: OrderCookieData
}

// This component stores the order to cookies when mounted
export function StoreOrderCookie({ order }: StoreOrderCookieProps) {
  useEffect(() => {
    storeOrder(order)
  }, [order])

  return null // This component doesn't render anything
}
