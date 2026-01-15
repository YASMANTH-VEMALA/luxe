'use client'

import { cn } from '@/lib/utils'

interface SizeSelectorProps {
  sizes: string[]
  selectedSize: string | null
  onSelect: (size: string) => void
}

export function SizeSelector({ sizes, selectedSize, onSelect }: SizeSelectorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button className="text-xs text-[#8B8178] underline underline-offset-2 hover:text-[#C4A962] transition-colors">Size Guide</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <button
            key={size}
            className={cn(
              'min-w-[3.5rem] h-11 border text-sm uppercase tracking-wider font-medium transition-all duration-300',
              selectedSize === size 
                ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' 
                : 'border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
            )}
            onClick={() => onSelect(size)}
          >
            {size}
          </button>
        ))}
      </div>
      {!selectedSize && (
        <p className="text-xs text-red-500 mt-2">Please select a size</p>
      )}
    </div>
  )
}
