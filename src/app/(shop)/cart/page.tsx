'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Truck, Shield } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { CheckoutDrawer } from '@/components/checkout/CheckoutDrawer'

export default function CartPage() {
  const { items, updateQuantity, removeItem, getSubtotal, isHydrated } = useCartStore()
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  
  const subtotal = getSubtotal()

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-6">Shopping Bag</h1>
          <div className="animate-pulse space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-4 p-4 bg-white border border-[#E8E4DD]">
                <div className="w-24 h-32 bg-[#E8E4DD]" />
                <div className="flex-1 space-y-3">
                  <div className="h-3 bg-[#E8E4DD] w-3/4" />
                  <div className="h-4 bg-[#E8E4DD] w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF7F2]">
        <div className="container mx-auto px-4 py-16 text-center">
          <ShoppingBag className="w-16 h-16 mx-auto text-[#E8E4DD] mb-6" />
          <h1 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-3">Your bag is empty</h1>
          <p className="text-[#8B8178] mb-8">
            Looks like you haven&apos;t added anything yet.
          </p>
          <Link 
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 bg-[#1A1A1A] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#C4A962] transition-all duration-300"
          >
            Start Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      <div className="container mx-auto px-4 py-6 pb-48 md:pb-8">
        <h1 className="font-serif text-2xl md:text-3xl text-[#1A1A1A] mb-6">
          Shopping Bag <span className="text-[#8B8178] text-lg font-sans">({items.length})</span>
        </h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={`${item.productId}-${item.size || 'default'}`}
                className="flex gap-4 p-4 bg-white border border-[#E8E4DD]"
              >
                {/* Image */}
                <Link href={`/products/${item.productId}`} className="flex-shrink-0">
                  <div className="relative w-24 h-32 overflow-hidden bg-[#F5F3EE]">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[#8B8178] text-xs">
                        No Image
                      </div>
                    )}
                  </div>
                </Link>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${item.productId}`}>
                    <h3 className="font-medium text-[#1A1A1A] line-clamp-2 hover:text-[#C4A962] transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  {item.size && (
                    <p className="text-xs text-[#8B8178] mt-1 uppercase tracking-wider">Size: {item.size}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-semibold text-[#1A1A1A]">
                      {formatPrice(item.sale_price ?? item.price)}
                    </span>
                    {item.sale_price && item.sale_price < item.price && (
                      <span className="text-sm text-[#8B8178] line-through">
                        {formatPrice(item.price)}
                      </span>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-[#E8E4DD]">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1, item.size)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F5F3EE] transition-colors"
                      >
                        <Minus className="w-4 h-4 text-[#1A1A1A]" />
                      </button>
                      <span className="w-10 text-center font-medium text-[#1A1A1A]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1, item.size)}
                        className="w-9 h-9 flex items-center justify-center hover:bg-[#F5F3EE] transition-colors"
                      >
                        <Plus className="w-4 h-4 text-[#1A1A1A]" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeItem(item.productId, item.size)}
                      className="text-[#8B8178] hover:text-red-500 p-2 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-white border border-[#E8E4DD] p-6 space-y-5">
              <h2 className="font-serif text-lg text-[#1A1A1A]">Order Summary</h2>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#8B8178]">Subtotal</span>
                  <span className="text-[#1A1A1A]">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#8B8178]">Shipping</span>
                  <span className={subtotal >= 49900 ? 'text-[#C4A962]' : 'text-[#1A1A1A]'}>
                    {subtotal >= 49900 ? 'FREE' : formatPrice(4900)}
                  </span>
                </div>
              </div>

              <div className="border-t border-[#E8E4DD] pt-4">
                <div className="flex justify-between font-semibold text-lg">
                  <span className="text-[#1A1A1A]">Total</span>
                  <span className="text-[#1A1A1A]">
                    {formatPrice(subtotal + (subtotal >= 49900 ? 0 : 4900))}
                  </span>
                </div>
                <p className="text-xs text-[#8B8178] mt-1">
                  (Inclusive of all taxes)
                </p>
              </div>

              <button 
                onClick={() => setIsCheckoutOpen(true)}
                className="w-full btn-gold py-4 text-sm uppercase tracking-wider font-bold"
              >
                Proceed to Checkout
              </button>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#E8E4DD]">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#C4A962]" />
                  <span className="text-xs text-[#8B8178]">Free Shipping ₹499+</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#C4A962]" />
                  <span className="text-xs text-[#8B8178]">Secure Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Checkout Button - Mobile */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-[#E8E4DD] md:hidden safe-area-pb z-30">
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[#8B8178] text-sm">Total</span>
            <span className="font-semibold text-lg text-[#1A1A1A]">
              {formatPrice(subtotal + (subtotal >= 49900 ? 0 : 4900))}
            </span>
          </div>
          <button 
            onClick={() => setIsCheckoutOpen(true)}
            className="w-full btn-gold py-4 text-sm uppercase tracking-wider font-bold"
          >
            Proceed to Checkout
          </button>
        </div>
      </div>

      {/* Checkout Drawer */}
      <CheckoutDrawer 
        isOpen={isCheckoutOpen} 
        onClose={() => setIsCheckoutOpen(false)} 
      />
    </div>
  )
}
