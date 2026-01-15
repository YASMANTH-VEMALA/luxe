'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setShowBanner(true)
    }
  }, [])

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setShowBanner(false)
    // Reload to enable cart persistence
    window.location.reload()
  }

  const declineCookies = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setShowBanner(false)
  }

  if (!showBanner) return null

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white border shadow-lg rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              We use cookies 🍪
            </p>
            <p className="text-xs text-gray-600 mt-1">
              We use cookies to save your cart and improve your shopping experience. 
              Your data stays on your device.
            </p>
          </div>
          <button 
            onClick={declineCookies}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <Button
            onClick={acceptCookies}
            size="sm"
            className="flex-1"
          >
            Accept
          </Button>
          <Button
            onClick={declineCookies}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
