'use client'

import { useEffect, useCallback, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { trackVisitor, updateVisitorContact } from '@/app/actions/visitors'

// Generate or retrieve session ID
function getSessionId(): string {
  if (typeof window === 'undefined') return ''
  
  let sessionId = sessionStorage.getItem('luxe_session_id')
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    sessionStorage.setItem('luxe_session_id', sessionId)
  }
  return sessionId
}

export function useVisitorTracking() {
  const pathname = usePathname()
  const lastTrackedPath = useRef<string>('')
  const sessionIdRef = useRef<string>('')
  const isInitialized = useRef(false)
  const isTracking = useRef(false)

  // Initialize session ID on client - only once
  useEffect(() => {
    if (!isInitialized.current) {
      sessionIdRef.current = getSessionId()
      isInitialized.current = true
    }
  }, [])

  // Track page views - with debounce protection
  useEffect(() => {
    // Skip if not initialized, already tracking, or same path
    if (!isInitialized.current || !sessionIdRef.current || isTracking.current) return
    if (pathname === lastTrackedPath.current) return
    
    isTracking.current = true
    lastTrackedPath.current = pathname
    
    // Small delay to batch rapid navigation
    const timeoutId = setTimeout(() => {
      trackVisitor({
        sessionId: sessionIdRef.current,
        pageUrl: pathname,
        pageTitle: typeof document !== 'undefined' ? document.title : '',
        eventType: 'page_view',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        referrer: typeof document !== 'undefined' ? document.referrer : '',
      })
        .catch(console.error)
        .finally(() => {
          isTracking.current = false
        })
    }, 100)
    
    return () => {
      clearTimeout(timeoutId)
      isTracking.current = false
    }
  }, [pathname])

  // Track product view
  const trackProductView = useCallback((productId: string, productTitle: string) => {
    if (!sessionIdRef.current) return
    
    trackVisitor({
      sessionId: sessionIdRef.current,
      pageUrl: window.location.pathname,
      pageTitle: document.title,
      productId,
      productTitle,
      eventType: 'product_view',
      userAgent: navigator.userAgent,
    }).catch(console.error)
  }, [])

  // Track add to cart
  const trackAddToCart = useCallback((productId: string, productTitle: string) => {
    if (!sessionIdRef.current) return
    
    trackVisitor({
      sessionId: sessionIdRef.current,
      productId,
      productTitle,
      eventType: 'add_to_cart',
      userAgent: navigator.userAgent,
    }).catch(console.error)
  }, [])

  // Track checkout start
  const trackCheckoutStart = useCallback(() => {
    if (!sessionIdRef.current) return
    
    trackVisitor({
      sessionId: sessionIdRef.current,
      eventType: 'checkout_start',
      userAgent: navigator.userAgent,
    }).catch(console.error)
  }, [])

  // Update visitor contact info (when they enter name/email/phone at checkout)
  const updateContact = useCallback((data: { name?: string; email?: string; phone?: string }) => {
    if (!sessionIdRef.current) return
    
    updateVisitorContact({
      sessionId: sessionIdRef.current,
      ...data
    }).catch(console.error)
  }, [])

  return {
    sessionId: sessionIdRef.current,
    trackProductView,
    trackAddToCart,
    trackCheckoutStart,
    updateContact,
  }
}
