'use client'

import { ReactNode } from 'react'
import { PageTransitionProvider } from '@/components/ui/page-transition'

interface PageTransitionWrapperProps {
  children: ReactNode
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  return (
    <PageTransitionProvider>
      {children}
    </PageTransitionProvider>
  )
}
