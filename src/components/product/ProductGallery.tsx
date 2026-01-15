'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProductGalleryProps {
  images: string[]
  title: string
}

const fallbackImage = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&h=1000&fit=crop'

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const handleImageError = (index: number) => {
    setImageErrors(prev => new Set(prev).add(index))
  }

  const getImageSrc = (index: number) => {
    if (imageErrors.has(index)) return fallbackImage
    return images[index] || fallbackImage
  }

  if (!images || images.length === 0) {
    return (
      <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-400">No image</span>
      </div>
    )
  }

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  return (
    <div className="space-y-3">
      {/* Main Image */}
      <div className="relative aspect-[3/4] md:aspect-square overflow-hidden bg-[#F5F3EE]">
        <Image
          src={getImageSrc(currentIndex)}
          alt={`${title} - Image ${currentIndex + 1}`}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          onError={() => handleImageError(currentIndex)}
        />
        
        {images.length > 1 && (
          <>
            {/* Navigation arrows */}
            <button
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm hover:bg-white transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#1A1A1A]" />
            </button>
            
            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all duration-300',
                    index === currentIndex ? 'bg-[#C4A962] w-6' : 'bg-white/60'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails - Desktop */}
      {images.length > 1 && (
        <div className="hidden md:flex gap-3 overflow-x-auto">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative w-20 h-24 overflow-hidden flex-shrink-0 border transition-all duration-300',
                index === currentIndex ? 'border-[#C4A962] border-2' : 'border-[#E8E4DD] hover:border-[#C4A962]'
              )}
            >
              <Image
                src={getImageSrc(index)}
                alt={`${title} - Thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
                onError={() => handleImageError(index)}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
