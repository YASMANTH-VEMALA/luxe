'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'

interface ClickPosition {
  x: number
  y: number
  width: number
  height: number
}

interface TransitionContextType {
  startTransition: (href: string, imageUrl?: string, productName?: string, clickPosition?: ClickPosition) => void
  isTransitioning: boolean
  transitionData: {
    imageUrl: string | null
    productName: string | null
    phase: 'idle' | 'center' | 'moving' | 'complete'
  }
  completeTransition: () => void
}

const TransitionContext = createContext<TransitionContextType | null>(null)

export function usePageTransition() {
  const context = useContext(TransitionContext)
  if (!context) {
    return { 
      startTransition: () => {}, 
      isTransitioning: false,
      transitionData: { imageUrl: null, productName: null, phase: 'idle' as const },
      completeTransition: () => {}
    }
  }
  return context
}

interface PageTransitionProviderProps {
  children: ReactNode
}

export function PageTransitionProvider({ children }: PageTransitionProviderProps) {
  const router = useRouter()
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionImage, setTransitionImage] = useState<string | null>(null)
  const [productName, setProductName] = useState<string | null>(null)
  const [targetHref, setTargetHref] = useState<string | null>(null)
  const [phase, setPhase] = useState<'idle' | 'center' | 'moving' | 'complete'>('idle')
  const [clickPos, setClickPos] = useState<ClickPosition | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  // Check if mobile on mount
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const startTransition = useCallback((href: string, imageUrl?: string, name?: string, position?: ClickPosition) => {
    setTransitionImage(imageUrl || null)
    setProductName(name || null)
    setTargetHref(href)
    setClickPos(position || null)
    setPhase('center') // First go to center
    setIsTransitioning(true)
  }, [])

  const completeTransition = useCallback(() => {
    setPhase('complete')
    setTimeout(() => {
      setIsTransitioning(false)
      setTransitionImage(null)
      setProductName(null)
      setTargetHref(null)
      setClickPos(null)
      setPhase('idle')
    }, 500)
  }, [])

  // Phase 1: Move to center, then navigate
  useEffect(() => {
    if (phase === 'center' && targetHref) {
      const timer = setTimeout(() => {
        setPhase('moving')
        router.push(targetHref)
      }, isMobile ? 100 : 600) // Mobile: quick, Desktop: wait for center animation
      return () => clearTimeout(timer)
    }
  }, [phase, targetHref, router, isMobile])

  // Fallback complete transition
  useEffect(() => {
    if (phase === 'moving') {
      const fallbackTimer = setTimeout(() => {
        completeTransition()
      }, 1500)
      return () => clearTimeout(fallbackTimer)
    }
  }, [phase, completeTransition])

  const transitionData = {
    imageUrl: transitionImage,
    productName: productName,
    phase
  }

  return (
    <TransitionContext.Provider value={{ startTransition, isTransitioning, transitionData, completeTransition }}>
      {children}
      
      {/* Transition Overlay */}
      {phase !== 'idle' && transitionImage && clickPos && (
        <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
          {/* Dark backdrop */}
          <div 
            className={`absolute inset-0 bg-black transition-opacity duration-500 ${
              phase === 'complete' ? 'opacity-0' : 'opacity-80'
            }`}
          />
          
          {/* Animated Product Image */}
          <div
            className={`absolute overflow-hidden shadow-2xl transition-all ${
              phase === 'center' 
                ? 'duration-500 ease-out' 
                : phase === 'moving' 
                  ? 'duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]' 
                  : 'duration-400 ease-out'
            }`}
            style={{
              ...(phase === 'center' ? {
                // PHASE 1: Move to center (both mobile & desktop)
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: isMobile ? Math.min(280, window.innerWidth - 40) : 320,
                height: isMobile ? Math.min(280, window.innerWidth - 40) * 1.33 : 320 * 1.33,
                opacity: 1,
              } : phase === 'moving' ? {
                // PHASE 2: Move to final position
                ...(isMobile ? {
                  // Mobile: Move UP
                  top: 100,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: Math.min(window.innerWidth - 32, 300),
                  height: Math.min(window.innerWidth - 32, 300) * 1.33,
                  opacity: 1,
                } : {
                  // Desktop: Move LEFT
                  top: '50%',
                  left: '25%',
                  transform: 'translate(-50%, -50%)',
                  width: 380,
                  height: 380 * 1.33,
                  opacity: 1,
                })
              } : {
                // PHASE 3: Complete - fade out
                ...(isMobile ? {
                  top: 100,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: Math.min(window.innerWidth - 32, 300),
                  height: Math.min(window.innerWidth - 32, 300) * 1.33,
                  opacity: 0,
                } : {
                  top: '50%',
                  left: '25%',
                  transform: 'translate(-50%, -50%)',
                  width: 380,
                  height: 380 * 1.33,
                  opacity: 0,
                })
              })
            }}
          >
            {/* Gold Border */}
            <div className="absolute inset-0 border-2 border-[#C4A962] z-10" />
            
            <Image
              src={transitionImage}
              alt={productName || 'Product'}
              fill
              className="object-cover"
              priority
            />
            
            {/* Shine effect */}
            <div 
              className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent z-20 transition-transform duration-700 ${
                phase === 'center' ? '-translate-x-full' : 'translate-x-full'
              }`}
            />
          </div>
          
          {/* Product name & loading - Desktop right side, Mobile bottom */}
          <div 
            className={`absolute transition-all duration-700 ${
              isMobile 
                ? 'bottom-32 left-0 right-0 text-center px-6' 
                : 'top-1/2 right-[15%] -translate-y-1/2 text-left max-w-md'
            } ${
              phase === 'moving' || phase === 'center' 
                ? 'opacity-100 translate-x-0' 
                : 'opacity-0 translate-x-8'
            }`}
            style={{ transitionDelay: phase === 'center' ? '200ms' : '0ms' }}
          >
            <p className="text-[#C4A962] text-xs tracking-[0.3em] uppercase mb-3">
              {phase === 'center' ? 'Selected' : 'Opening'}
            </p>
            <h3 className="text-white font-serif text-2xl md:text-4xl font-light leading-tight mb-4">
              {productName}
            </h3>
            
            {/* Loading indicator */}
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <div className="w-2 h-2 bg-[#C4A962] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-[#C4A962] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-[#C4A962] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
          
          {/* Decorative corners - Desktop only */}
          {!isMobile && (
            <>
              <div 
                className={`absolute top-8 left-8 w-20 h-20 border-l-2 border-t-2 border-[#C4A962]/60 transition-all duration-500 ${
                  phase === 'complete' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                }`}
              />
              <div 
                className={`absolute bottom-8 right-8 w-20 h-20 border-r-2 border-b-2 border-[#C4A962]/60 transition-all duration-500 ${
                  phase === 'complete' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
                }`}
              />
            </>
          )}
        </div>
      )}
    </TransitionContext.Provider>
  )
}

// Product card link with transition
interface TransitionLinkProps {
  href: string
  imageUrl?: string
  productName?: string
  children: ReactNode
  className?: string
  style?: React.CSSProperties
}

export function TransitionLink({ href, imageUrl, productName, children, className = '', style }: TransitionLinkProps) {
  const { startTransition } = usePageTransition()
  const router = useRouter()
  const linkRef = useRef<HTMLAnchorElement>(null)

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    
    if (!imageUrl) {
      router.push(href)
      return
    }
    
    // Get the clicked element's position
    const rect = linkRef.current?.getBoundingClientRect()
    const position: ClickPosition | undefined = rect ? {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    } : undefined
    
    startTransition(href, imageUrl, productName, position)
  }

  return (
    <a ref={linkRef} href={href} onClick={handleClick} className={className} style={style}>
      {children}
    </a>
  )
}
