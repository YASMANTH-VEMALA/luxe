'use client'

import { useState, useEffect } from 'react'
import { Users, TrendingUp, Package, AlertTriangle } from 'lucide-react'

interface UrgencyBadgeProps {
  stockQuantity: number
  lowStockThreshold: number
  showStockCount: boolean
  fakeSoldCount?: number
  fakeViewers?: number
}

export function UrgencyBadge({
  stockQuantity,
  lowStockThreshold,
  showStockCount,
  fakeSoldCount = 0,
  fakeViewers = 0,
}: UrgencyBadgeProps) {
  const [viewers, setViewers] = useState(fakeViewers)
  const [timeLeft, setTimeLeft] = useState(getRandomTime())
  
  const isOutOfStock = stockQuantity <= 0
  const isLowStock = stockQuantity <= lowStockThreshold && stockQuantity > 0

  // Randomize viewers slightly on mount
  useEffect(() => {
    const baseViewers = fakeViewers || Math.floor(Math.random() * 15) + 5
    setViewers(baseViewers)
    
    // Fluctuate viewers
    const interval = setInterval(() => {
      setViewers(v => {
        const change = Math.floor(Math.random() * 5) - 2
        return Math.max(3, Math.min(25, v + change))
      })
    }, 10000)
    
    return () => clearInterval(interval)
  }, [fakeViewers])

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.minutes === 0 && prev.seconds === 0) {
          return getRandomTime()
        }
        if (prev.seconds === 0) {
          return { minutes: prev.minutes - 1, seconds: 59 }
        }
        return { ...prev, seconds: prev.seconds - 1 }
      })
    }, 1000)
    
    return () => clearInterval(timer)
  }, [])

  function getRandomTime() {
    return {
      minutes: Math.floor(Math.random() * 30) + 10,
      seconds: Math.floor(Math.random() * 60)
    }
  }

  // Show out of stock message
  if (isOutOfStock) {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm bg-red-50 p-3 rounded-lg border border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600" />
          <span className="text-red-600 font-semibold">Out of Stock</span>
        </div>
        <p className="text-sm text-[#8B8178]">
          This item is currently unavailable. Please check back later.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {/* Low stock warning */}
      {isLowStock && showStockCount && (
        <div className="flex items-center gap-2 text-sm">
          <Package className="h-4 w-4 text-red-600" />
          <span className="text-red-600 font-medium">Only {stockQuantity} left!</span>
        </div>
      )}

      {/* Social proof - sold count */}
      {fakeSoldCount > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-[#C4A962]" />
          <span className="text-[#1A1A1A]">{fakeSoldCount}+ sold recently</span>
        </div>
      )}

      {/* Viewing now */}
      <div className="flex items-center gap-2 text-sm">
        <div className="relative">
          <Users className="h-4 w-4 text-[#8B8178]" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        </div>
        <span className="text-[#8B8178]">{viewers} people viewing</span>
      </div>
    </div>
  )
}
