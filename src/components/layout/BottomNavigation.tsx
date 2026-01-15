'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, ShoppingBag, Package } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { cn } from '@/lib/utils'
import { useState, useEffect } from 'react'
import { getOrderCount } from '@/lib/orderCookies'

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/products', icon: Search, label: 'Shop' },
  { href: '/cart', icon: ShoppingBag, label: 'Bag', showCartBadge: true },
  { href: '/my-orders', icon: Package, label: 'Orders', showOrderBadge: true },
]

export function BottomNavigation() {
  const pathname = usePathname()
  const { getTotalItems, isHydrated } = useCartStore()
  const totalItems = isHydrated ? getTotalItems() : 0
  const [orderCount, setOrderCount] = useState(0)
  
  // Load order count from cookies
  useEffect(() => {
    setOrderCount(getOrderCount())
  }, [])

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E4DD] md:hidden safe-area-pb">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full relative transition-colors',
                isActive ? 'text-[#1A1A1A]' : 'text-[#8B8178]'
              )}
            >
              <div className="relative">
                <item.icon 
                  className={cn(
                    'h-5 w-5 transition-colors',
                    isActive && 'text-[#C4A962]'
                  )} 
                  strokeWidth={isActive ? 2.5 : 1.5} 
                />
                {item.showCartBadge && totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#C4A962] text-[#1A1A1A] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
                {item.showOrderBadge && orderCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[#C4A962] text-[#1A1A1A] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {orderCount > 9 ? '9+' : orderCount}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] mt-1 uppercase tracking-wider',
                isActive ? 'font-semibold text-[#1A1A1A]' : 'font-medium'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
