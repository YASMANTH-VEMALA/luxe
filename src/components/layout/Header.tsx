'use client'

import Link from 'next/link'
import { ShoppingBag, User, Search, Menu, Package } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { useState, useEffect } from 'react'
import { getOrderCount } from '@/lib/orderCookies'

interface HeaderProps {
  user?: { email: string } | null
}

export function Header({ user }: HeaderProps) {
  const { getTotalItems, isHydrated } = useCartStore()
  const totalItems = isHydrated ? getTotalItems() : 0
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [orderCount, setOrderCount] = useState(0)
  
  // Load order count from cookies on mount
  useEffect(() => {
    setOrderCount(getOrderCount())
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E8E4DD]">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Left - Menu (Mobile) */}
        <div className="flex items-center gap-4 md:hidden">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1"
          >
            <Menu className="h-5 w-5 text-[#1A1A1A]" />
          </button>
        </div>

        {/* Desktop Navigation - Left */}
        <nav className="hidden md:flex items-center gap-8">
          <Link 
            href="/products" 
            className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A] hover:text-[#C4A962] transition-colors"
          >
            Shop All
          </Link>
          <Link 
            href="/products?category=necklaces" 
            className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A] hover:text-[#C4A962] transition-colors"
          >
            Jewelry
          </Link>
          <Link 
            href="/products?category=dresses" 
            className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A] hover:text-[#C4A962] transition-colors"
          >
            Dresses
          </Link>
        </nav>

        {/* Logo - Center */}
        <Link href="/" className="absolute left-1/2 -translate-x-1/2">
          <span className="font-serif text-2xl md:text-3xl font-medium tracking-wide text-[#1A1A1A]">
            LUXE
          </span>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Search - Desktop */}
          <button className="hidden md:flex p-2 hover:bg-[#FAF7F2] rounded-full transition-colors">
            <Search className="h-5 w-5 text-[#1A1A1A]" />
          </button>

          {/* Orders - Desktop */}
          <Link 
            href="/my-orders" 
            className="hidden md:flex relative p-2 hover:bg-[#FAF7F2] rounded-full transition-colors"
            title="My Orders"
          >
            <Package className="h-5 w-5 text-[#1A1A1A]" />
            {orderCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#C4A962] text-[#1A1A1A] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {orderCount > 9 ? '9+' : orderCount}
              </span>
            )}
          </Link>

          {/* User */}
          {user ? (
            <Link href="/profile" className="hidden md:flex p-2 hover:bg-[#FAF7F2] rounded-full transition-colors">
              <User className="h-5 w-5 text-[#1A1A1A]" />
            </Link>
          ) : (
            <Link href="/login" className="hidden md:flex">
              <span className="text-xs font-medium uppercase tracking-wider text-[#1A1A1A] hover:text-[#C4A962] transition-colors">
                Sign In
              </span>
            </Link>
          )}

          {/* Cart */}
          <Link href="/cart" className="relative p-2 hover:bg-[#FAF7F2] rounded-full transition-colors">
            <ShoppingBag className="h-5 w-5 text-[#1A1A1A]" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#C4A962] text-[#1A1A1A] text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                {totalItems > 9 ? '9+' : totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E8E4DD] py-4">
          <nav className="container mx-auto px-4 flex flex-col gap-4">
            <Link 
              href="/products" 
              className="text-sm font-medium uppercase tracking-wider text-[#1A1A1A] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Shop All
            </Link>
            <Link 
              href="/products?category=necklaces" 
              className="text-sm font-medium uppercase tracking-wider text-[#1A1A1A] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Jewelry
            </Link>
            <Link 
              href="/products?category=dresses" 
              className="text-sm font-medium uppercase tracking-wider text-[#1A1A1A] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Dresses
            </Link>
            <Link 
              href="/my-orders" 
              className="text-sm font-medium uppercase tracking-wider text-[#1A1A1A] py-2 flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Package className="h-4 w-4" />
              My Orders
            </Link>
            <Link 
              href="/track-order" 
              className="text-sm font-medium uppercase tracking-wider text-[#1A1A1A] py-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              Track Order
            </Link>
            {!user && (
              <Link 
                href="/login" 
                className="text-sm font-medium uppercase tracking-wider text-[#C4A962] py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
