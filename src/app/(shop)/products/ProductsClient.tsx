'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import type { Product, Category } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { SlidersHorizontal, X, ChevronDown, Star, Eye } from 'lucide-react'
import { TransitionLink } from '@/components/ui/page-transition'
import { ScrollReveal } from '@/components/ui/scroll-reveal'

interface ProductsClientProps {
  initialProducts: Product[]
  categories: Category[]
  searchParams: {
    category?: string
    sort?: string
    minPrice?: string
    maxPrice?: string
  }
}

const PRODUCTS_PER_PAGE = 10

const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Most Popular' },
]

export function ProductsClient({ initialProducts, categories, searchParams }: ProductsClientProps) {
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>(initialProducts)
  const [isLoading, setIsLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length === PRODUCTS_PER_PAGE)
  const [page, setPage] = useState(1)
  const observerRef = useRef<HTMLDivElement>(null)
  
  const [filters, setFilters] = useState({
    category: searchParams.category || '',
    sort: searchParams.sort || 'newest',
    minPrice: searchParams.minPrice || '',
    maxPrice: searchParams.maxPrice || '',
  })
  
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Count active filters
  useEffect(() => {
    let count = 0
    if (filters.category) count++
    if (filters.minPrice || filters.maxPrice) count++
    if (filters.sort !== 'newest') count++
    setActiveFiltersCount(count)
  }, [filters])

  // Load more products (infinite scroll)
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    setIsLoading(true)
    const supabase = createClient()
    
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .range(page * PRODUCTS_PER_PAGE, (page + 1) * PRODUCTS_PER_PAGE - 1)

    if (filters.category) {
      query = query.ilike('category', filters.category)
    }
    if (filters.minPrice) {
      query = query.gte('price', parseInt(filters.minPrice) * 100)
    }
    if (filters.maxPrice) {
      query = query.lte('price', parseInt(filters.maxPrice) * 100)
    }

    switch (filters.sort) {
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'popular':
        query = query.order('fake_sold_count', { ascending: false })
        break
      default:
        query = query.order('created_at', { ascending: false })
    }

    const { data } = await query
    
    if (data) {
      setProducts(prev => [...prev, ...data])
      setHasMore(data.length === PRODUCTS_PER_PAGE)
      setPage(prev => prev + 1)
    }
    
    setIsLoading(false)
  }, [page, filters, isLoading, hasMore])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [loadMore, hasMore, isLoading])

  // Apply filters
  const applyFilters = () => {
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.sort !== 'newest') params.set('sort', filters.sort)
    if (filters.minPrice) params.set('minPrice', filters.minPrice)
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice)
    
    router.push(`/products?${params.toString()}`)
    setIsFilterOpen(false)
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      category: '',
      sort: 'newest',
      minPrice: '',
      maxPrice: '',
    })
    router.push('/products')
    setIsFilterOpen(false)
  }

  // Refetch when URL params change
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true)
      const supabase = createClient()
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .range(0, PRODUCTS_PER_PAGE - 1)

      if (searchParams.category) {
        query = query.ilike('category', searchParams.category)
      }
      if (searchParams.minPrice) {
        query = query.gte('price', parseInt(searchParams.minPrice) * 100)
      }
      if (searchParams.maxPrice) {
        query = query.lte('price', parseInt(searchParams.maxPrice) * 100)
      }

      switch (searchParams.sort) {
        case 'price_asc':
          query = query.order('price', { ascending: true })
          break
        case 'price_desc':
          query = query.order('price', { ascending: false })
          break
        case 'popular':
          query = query.order('fake_sold_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      const { data } = await query
      
      if (data) {
        setProducts(data)
        setHasMore(data.length === PRODUCTS_PER_PAGE)
        setPage(1)
      }
      
      setIsLoading(false)
    }

    fetchProducts()
    setFilters({
      category: searchParams.category || '',
      sort: searchParams.sort || 'newest',
      minPrice: searchParams.minPrice || '',
      maxPrice: searchParams.maxPrice || '',
    })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Filter Bar */}
      <div className="sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-[#E8E4DD]">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              {/* Quick Category Filters */}
              <button
                className={`px-4 py-2 text-xs uppercase tracking-wider font-medium whitespace-nowrap transition-all duration-300 ${
                  !filters.category 
                    ? 'bg-[#1A1A1A] text-white' 
                    : 'border border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
                }`}
                onClick={() => {
                  setFilters(f => ({ ...f, category: '' }))
                  router.push('/products')
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className={`px-4 py-2 text-xs uppercase tracking-wider font-medium whitespace-nowrap transition-all duration-300 ${
                    filters.category?.toLowerCase() === cat.slug 
                      ? 'bg-[#1A1A1A] text-white' 
                      : 'border border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
                  }`}
                  onClick={() => {
                    setFilters(f => ({ ...f, category: cat.slug }))
                    router.push(`/products?category=${cat.slug}`)
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            
            {/* Filter Button */}
            <Sheet open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <SheetTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 border border-[#E8E4DD] text-xs uppercase tracking-wider font-medium flex-shrink-0 ml-2 hover:border-[#1A1A1A] transition-colors">
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 w-5 h-5 bg-[#C4A962] text-white text-[10px] flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] rounded-t-xl bg-[#FAF7F2]">
                <SheetHeader>
                  <SheetTitle className="font-serif text-xl">Filters</SheetTitle>
                </SheetHeader>
                
                <div className="py-6 space-y-6">
                  {/* Category */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-[#8B8178] mb-3">Category</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-300 ${
                          !filters.category 
                            ? 'bg-[#1A1A1A] text-white' 
                            : 'border border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
                        }`}
                        onClick={() => setFilters(f => ({ ...f, category: '' }))}
                      >
                        All
                      </button>
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-300 ${
                            filters.category === cat.slug 
                              ? 'bg-[#1A1A1A] text-white' 
                              : 'border border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
                          }`}
                          onClick={() => setFilters(f => ({ ...f, category: cat.slug }))}
                        >
                          {cat.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sort */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-[#8B8178] mb-3">Sort By</h3>
                    <div className="flex flex-wrap gap-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.value}
                          className={`px-4 py-2 text-xs uppercase tracking-wider font-medium transition-all duration-300 ${
                            filters.sort === option.value 
                              ? 'bg-[#1A1A1A] text-white' 
                              : 'border border-[#E8E4DD] text-[#1A1A1A] hover:border-[#1A1A1A]'
                          }`}
                          onClick={() => setFilters(f => ({ ...f, sort: option.value }))}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Price Range */}
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-[#8B8178] mb-3">Price Range</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="Min ₹"
                          value={filters.minPrice}
                          onChange={(e) => setFilters(f => ({ ...f, minPrice: e.target.value }))}
                          className="w-full px-3 py-3 border border-[#E8E4DD] text-sm bg-white focus:border-[#C4A962] focus:outline-none"
                        />
                      </div>
                      <span className="text-[#8B8178]">to</span>
                      <div className="flex-1">
                        <input
                          type="number"
                          placeholder="Max ₹"
                          value={filters.maxPrice}
                          onChange={(e) => setFilters(f => ({ ...f, maxPrice: e.target.value }))}
                          className="w-full px-3 py-3 border border-[#E8E4DD] text-sm bg-white focus:border-[#C4A962] focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-[#E8E4DD] flex gap-3">
                  <button 
                    className="flex-1 py-3 border border-[#1A1A1A] text-[#1A1A1A] text-xs uppercase tracking-wider font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-300" 
                    onClick={resetFilters}
                  >
                    Reset
                  </button>
                  <button 
                    className="flex-1 py-3 bg-[#1A1A1A] text-white text-xs uppercase tracking-wider font-medium hover:bg-[#C4A962] transition-all duration-300" 
                    onClick={applyFilters}
                  >
                    Apply Filters
                  </button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-4 py-6 pb-24">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs uppercase tracking-wider text-[#8B8178]">
            {products.length} products
          </p>
          
          {/* Desktop Sort */}
          <div className="hidden md:flex items-center gap-3">
            <span className="text-xs uppercase tracking-wider text-[#8B8178]">Sort:</span>
            <select
              value={filters.sort}
              onChange={(e) => {
                const newSort = e.target.value
                const params = new URLSearchParams(window.location.search)
                if (newSort !== 'newest') {
                  params.set('sort', newSort)
                } else {
                  params.delete('sort')
                }
                router.push(`/products?${params.toString()}`)
              }}
              className="px-4 py-2 border border-[#E8E4DD] text-sm bg-white focus:border-[#C4A962] focus:outline-none cursor-pointer"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {products.length === 0 && !isLoading ? (
          <div className="text-center py-16">
            <p className="text-[#8B8178] mb-6">No products found</p>
            <button 
              onClick={resetFilters}
              className="px-8 py-3 border border-[#1A1A1A] text-[#1A1A1A] text-xs uppercase tracking-wider font-medium hover:bg-[#1A1A1A] hover:text-white transition-all duration-300"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
            
            {/* Loading skeletons */}
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <ProductSkeleton key={`skeleton-${i}`} />
            ))}
          </div>
        )}

        {/* Infinite scroll trigger */}
        <div ref={observerRef} className="h-20" />
        
        {!hasMore && products.length > 0 && (
          <p className="text-center text-[#8B8178] text-sm py-12">
            You&apos;ve seen all products
          </p>
        )}
      </div>
    </div>
  )
}

function ProductCard({ product }: { product: Product }) {
  const [imageError, setImageError] = useState(false)
  const hasDiscount = product.sale_price && product.sale_price < product.price
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.sale_price! / product.price) * 100)
    : 0
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0
  const isLowStock = product.stock_quantity !== undefined && 
    product.stock_quantity > 0 && 
    product.stock_quantity <= (product.low_stock_threshold || 5)

  const fallbackImage = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&h=600&fit=crop'

  return (
    <TransitionLink 
      href={`/products/${product.slug}`} 
      imageUrl={product.images?.[0]}
      productName={product.title}
      className="group block hover-lift"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F3EE] mb-3">
        {(product.images?.[0] || imageError) ? (
          <Image
            src={imageError ? fallbackImage : product.images[0]}
            alt={product.title}
            fill
            className={`object-cover group-hover:scale-110 transition-transform duration-700 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            sizes="(max-width: 768px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8B8178]">
            No Image
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-300" />
        
        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="bg-[#1A1A1A] text-white px-4 py-2 text-xs uppercase tracking-wider font-medium">
              Out of Stock
            </span>
          </div>
        )}
        
        {/* Sale Badge - only show if in stock */}
        {hasDiscount && !isOutOfStock && (
          <span className="absolute top-2 left-2 bg-red-600 text-white px-3 py-1.5 text-xs font-bold uppercase">
            -{discountPercent}%
          </span>
        )}
        
        {/* Low Stock Badge */}
        {isLowStock && product.show_stock_count && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white px-2 py-1 text-[10px] uppercase tracking-wider font-bold animate-pulse">
            Only {product.stock_quantity} left
          </span>
        )}
        
        {/* Quick View on Hover - Desktop - only show if in stock */}
        {!isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 hidden md:block">
            <div className="w-full py-2.5 bg-white text-[#1A1A1A] text-xs uppercase tracking-wider font-bold text-center hover:bg-[#C4A962] transition-colors">
              Quick View
            </div>
          </div>
        )}
        
        {/* Viewers Badge on Hover */}
        {!isOutOfStock && product.fake_viewers && product.fake_viewers > 0 && (
          <div className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 text-xs text-[#1A1A1A] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {product.fake_viewers} viewing
          </div>
        )}
      </div>
      
      {/* Product Info */}
      <div className="space-y-1.5">
        {/* Category */}
        <p className="text-[10px] text-[#C4A962] uppercase tracking-[0.15em]">
          {product.category}
        </p>
        
        {/* Title */}
        <h3 className={`text-sm font-medium line-clamp-2 transition-colors duration-300 ${isOutOfStock ? 'text-[#8B8178]' : 'text-[#1A1A1A] group-hover:text-[#C4A962]'}`}>
          {product.title}
        </h3>
        
        {/* Rating */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-[#C4A962] text-[#C4A962]" />
          ))}
          <span className="text-[10px] text-[#8B8178] ml-1">({product.fake_sold_count || 0})</span>
        </div>
        
        {/* Price */}
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-lg font-bold ${isOutOfStock ? 'text-[#8B8178]' : 'text-[#1A1A1A]'}`}>
            {formatPrice(product.sale_price ?? product.price)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-[#8B8178] line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
        
        {/* Viewers Badge - Mobile */}
        {!isOutOfStock && product.fake_viewers && product.fake_viewers > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-[#8B8178] md:hidden">
            <Eye className="w-3 h-3" />
            <span>{product.fake_viewers} viewing</span>
          </div>
        )}
      </div>
    </TransitionLink>
  )
}

function ProductSkeleton() {
  return (
    <div>
      <Skeleton className="aspect-[3/4] mb-3 bg-[#E8E4DD]" />
      <Skeleton className="h-2 w-12 mb-2 bg-[#E8E4DD]" />
      <Skeleton className="h-4 w-full mb-2 bg-[#E8E4DD]" />
      <Skeleton className="h-3 w-16 mb-2 bg-[#E8E4DD]" />
      <Skeleton className="h-4 w-20 bg-[#E8E4DD]" />
    </div>
  )
}
