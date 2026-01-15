'use client'

import { useVisitorTracking } from '@/hooks/useVisitorTracking'

export function VisitorTracker() {
  // This hook automatically tracks page views
  useVisitorTracking()
  
  return null
}
