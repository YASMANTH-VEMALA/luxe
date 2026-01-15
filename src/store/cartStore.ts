'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { CartItem } from '@/types'

interface CartStore {
  items: CartItem[]
  isHydrated: boolean
  setHydrated: () => void
  addItem: (item: CartItem) => void
  removeItem: (productId: string, size?: string) => void
  updateQuantity: (productId: string, quantity: number, size?: string) => void
  clearCart: () => void
  getSubtotal: () => number
  getTotalItems: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isHydrated: false,
      
      setHydrated: () => set({ isHydrated: true }),
      
      addItem: (item) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (i) => i.productId === item.productId && i.size === item.size
          )

          if (existingIndex > -1) {
            const newItems = [...state.items]
            newItems[existingIndex].quantity += item.quantity
            return { items: newItems }
          }

          return { items: [...state.items, item] }
        })
      },

      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.productId === productId && i.size === size)
          ),
        }))
      },

      updateQuantity: (productId, quantity, size) => {
        if (quantity <= 0) {
          get().removeItem(productId, size)
          return
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.productId === productId && item.size === size
              ? { ...item, quantity }
              : item
          ),
        }))
      },

      clearCart: () => set({ items: [] }),

      getSubtotal: () => {
        const items = get().items
        return items.reduce((total, item) => {
          const price = item.sale_price ?? item.price
          return total + price * item.quantity
        }, 0)
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0)
      },
    }),
    {
      name: 'luxe-cart',
      storage: createJSONStorage(() => {
        // Check if cookies are consented
        if (typeof window !== 'undefined') {
          const consent = localStorage.getItem('cookie-consent')
          if (consent === 'accepted') {
            return localStorage
          }
        }
        // Return a no-op storage if consent not given
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)

// Helper to format price from paise to rupees
export function formatPrice(priceInPaise: number): string {
  return `₹${(priceInPaise / 100).toLocaleString('en-IN')}`
}
