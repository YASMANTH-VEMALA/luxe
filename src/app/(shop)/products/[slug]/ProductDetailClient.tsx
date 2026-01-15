'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ShoppingBag, Heart, Share2, Check, Truck, Shield, RotateCcw, Star, Clock, ChevronLeft, ChevronRight, Sparkles, Package, Award } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { toast } from 'sonner'
import { usePageTransition, TransitionLink } from '@/components/ui/page-transition'

interface ProductDetailClientProps {
  product: Product
  relatedProducts?: Product[]
}

export function ProductDetailClient({ product, relatedProducts = [] }: ProductDetailClientProps) {
  const router = useRouter()
  const { addItem } = useCartStore()
  const { completeTransition } = usePageTransition()
  const [selectedSize, setSelectedSize] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const relatedSectionRef = useRef<HTMLDivElement>(null)
  const [relatedVisible, setRelatedVisible] = useState(false)
  
  // Sequential animation states
  const [animationStage, setAnimationStage] = useState(0)
  
  // Trigger sequential animations on mount
  useEffect(() => {
    const stages = [
      100,   // Stage 1: Back button
      250,   // Stage 2: Image visible
      400,   // Stage 3: Category label
      500,   // Stage 4: Product title
      600,   // Stage 5: Rating
      700,   // Stage 6: Price
      850,   // Stage 7: Description
      1000,  // Stage 8: Size selector / Urgency
      1150,  // Stage 9: Trust badges
      1300,  // Stage 10: Action buttons
    ]
    
    stages.forEach((delay, index) => {
      setTimeout(() => setAnimationStage(index + 1), delay)
    })
    
    // Complete any pending transition
    const completeTimer = setTimeout(() => {
      completeTransition()
    }, 600)
    
    return () => clearTimeout(completeTimer)
  }, [completeTransition])

  // Observer for related products section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRelatedVisible(true)
            observer.disconnect()
          }
        })
      },
      { threshold: 0.1 }
    )

    if (relatedSectionRef.current) {
      observer.observe(relatedSectionRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const hasDiscount = product.sale_price && product.sale_price < product.price
  const discountPercent = hasDiscount 
    ? Math.round((1 - product.sale_price! / product.price) * 100)
    : 0
  
  const needsSize = product.category.toLowerCase() === 'dresses' && product.sizes && product.sizes.length > 0
  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0
  const images = product.images?.length ? product.images : ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600']

  const handleAddToCart = async () => {
    if (isOutOfStock) {
      toast.error('This product is currently out of stock')
      return
    }
    
    if (needsSize && !selectedSize) {
      toast.error('Please select a size')
      return
    }

    setIsAdding(true)
    await new Promise(resolve => setTimeout(resolve, 300))

    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      sale_price: product.sale_price,
      image: product.images?.[0] || '',
      quantity: 1,
      size: selectedSize || undefined,
    })

    setIsAdding(false)
    setAdded(true)
    toast.success('Added to cart!')
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (isOutOfStock) {
      toast.error('This product is currently out of stock')
      return
    }
    
    if (needsSize && !selectedSize) {
      toast.error('Please select a size')
      return
    }

    addItem({
      productId: product.id,
      title: product.title,
      price: product.price,
      sale_price: product.sale_price,
      image: product.images?.[0] || '',
      quantity: 1,
      size: selectedSize || undefined,
    })

    router.push('/cart')
  }

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product.title,
        text: `Check out ${product.title} on Luxe!`,
        url: window.location.href,
      })
    } catch {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard!')
    }
  }

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A1A] via-[#2A2A2A] to-[#1A1A1A] overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#C4A962]/10 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#C4A962]/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative container mx-auto px-4 py-6 md:py-12 pb-36 md:pb-12">
        {/* Back Button */}
        <button 
          onClick={() => router.back()}
          className={`mb-6 flex items-center gap-2 text-white/60 hover:text-[#C4A962] transition-all duration-500 ${
            animationStage >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm uppercase tracking-wider">Back</span>
        </button>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Left Side - Image Gallery */}
          <div 
            className={`relative transition-all duration-700 ease-out ${
              animationStage >= 2 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-8'
            }`}
          >
            {/* Main Image Card */}
            <div className="relative group">
              {/* Decorative Frame */}
              <div className="absolute -inset-4 bg-gradient-to-br from-[#C4A962]/20 via-transparent to-[#C4A962]/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Gold Corner Accents */}
              <div className="absolute -top-2 -left-2 w-8 h-8 border-l-2 border-t-2 border-[#C4A962] opacity-60" />
              <div className="absolute -top-2 -right-2 w-8 h-8 border-r-2 border-t-2 border-[#C4A962] opacity-60" />
              <div className="absolute -bottom-2 -left-2 w-8 h-8 border-l-2 border-b-2 border-[#C4A962] opacity-60" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 border-r-2 border-b-2 border-[#C4A962] opacity-60" />
              
              {/* Image Container */}
              <div className="relative aspect-[3/4] overflow-hidden bg-[#2A2A2A] rounded-lg">
                <Image
                  src={images[selectedImageIndex]}
                  alt={product.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  priority
                />
                
                {/* Gradient Overlays */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Sale Badge */}
                {hasDiscount && !isOutOfStock && (
                  <div className="absolute top-4 left-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-red-600 blur-lg opacity-50 animate-pulse" />
                      <div className="relative bg-red-600 text-white px-4 py-2 text-sm font-bold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        {discountPercent}% OFF
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Out of Stock Overlay */}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-white text-[#1A1A1A] px-6 py-3 text-sm uppercase tracking-wider font-bold">
                      Sold Out
                    </span>
                  </div>
                )}
                
                {/* Navigation Arrows */}
                {images.length > 1 && (
                  <>
                    <button 
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button 
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                  </>
                )}
                
                {/* Image Counter */}
                {images.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
                    {images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                          index === selectedImageIndex 
                            ? 'bg-[#C4A962] w-6' 
                            : 'bg-white/40 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-3 mt-4 justify-center">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImageIndex(index)}
                    className={`relative w-16 h-20 overflow-hidden transition-all duration-300 ${
                      index === selectedImageIndex 
                        ? 'ring-2 ring-[#C4A962] ring-offset-2 ring-offset-[#1A1A1A]' 
                        : 'opacity-50 hover:opacity-100'
                    }`}
                  >
                    <Image src={img} alt="" fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Side - Product Info */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div 
              className={`transition-all duration-700 ease-out ${
                animationStage >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <span className="inline-flex items-center gap-2 bg-[#C4A962]/10 border border-[#C4A962]/30 px-4 py-2 text-[#C4A962] text-xs uppercase tracking-[0.2em]">
                <Sparkles className="w-3 h-3" />
                {product.category}
              </span>
            </div>

            {/* Title */}
            <h1 
              className={`font-serif text-3xl md:text-5xl font-light text-white leading-tight transition-all duration-700 ease-out ${
                animationStage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              {product.title}
            </h1>

            {/* Rating */}
            <div 
              className={`flex items-center gap-3 transition-all duration-700 ease-out ${
                animationStage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-[#C4A962] text-[#C4A962]" />
                ))}
              </div>
              <span className="text-white/60 text-sm">
                {product.fake_sold_count}+ Happy Customers
              </span>
            </div>

            {/* Price Section */}
            <div 
              className={`flex items-baseline gap-4 py-4 border-b border-white/10 transition-all duration-700 ease-out ${
                animationStage >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <div className="relative">
                <span className="text-4xl md:text-5xl font-bold text-white">
                  {formatPrice(product.sale_price ?? product.price)}
                </span>
                {/* Price glow effect */}
                <div className="absolute -inset-2 bg-[#C4A962]/20 blur-xl -z-10 rounded-full" />
              </div>
              {hasDiscount && (
                <>
                  <span className="text-xl text-white/40 line-through">
                    {formatPrice(product.price)}
                  </span>
                  <span className="bg-gradient-to-r from-red-600 to-red-500 text-white px-3 py-1 text-sm font-bold rounded-full">
                    SAVE {formatPrice(product.price - (product.sale_price || 0))}
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div 
                className={`transition-all duration-700 ease-out ${
                  animationStage >= 7 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <h3 className="text-[#C4A962] text-xs uppercase tracking-[0.2em] mb-3">About This Piece</h3>
                <p className="text-white/70 leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Urgency Section */}
            <div 
              className={`transition-all duration-700 ease-out ${
                animationStage >= 8 ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
              }`}
            >
              <div className="bg-gradient-to-r from-red-900/30 to-orange-900/30 border border-red-500/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 text-red-400 mb-2">
                  <Clock className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Limited Time Offer</span>
                </div>
                <div className="flex flex-wrap gap-4 text-sm">
                  {product.fake_viewers && product.fake_viewers > 0 && (
                    <div className="flex items-center gap-2 text-white/80">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span>{product.fake_viewers} people viewing now</span>
                    </div>
                  )}
                  {product.stock_quantity !== undefined && product.stock_quantity > 0 && product.stock_quantity <= (product.low_stock_threshold || 10) && (
                    <div className="flex items-center gap-2 text-orange-400">
                      <Package className="w-4 h-4" />
                      <span>Only {product.stock_quantity} left in stock!</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Size Selector */}
            {needsSize && (
              <div 
                className={`transition-all duration-700 ease-out ${
                  animationStage >= 8 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                <h3 className="text-[#C4A962] text-xs uppercase tracking-[0.2em] mb-3">Select Size</h3>
                <div className="flex flex-wrap gap-3">
                  {product.sizes!.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`w-14 h-14 flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                        selectedSize === size
                          ? 'bg-[#C4A962] text-[#1A1A1A] scale-110'
                          : 'bg-white/5 text-white/80 hover:bg-white/10 border border-white/20'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trust Badges */}
            <div 
              className={`grid grid-cols-2 gap-4 py-6 border-t border-b border-white/10 transition-all duration-700 ease-out ${
                animationStage >= 9 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {[
                { icon: Truck, title: 'Free Shipping', desc: 'On orders ₹499+' },
                { icon: Shield, title: 'Secure Payment', desc: '100% Protected' },
                { icon: RotateCcw, title: 'Easy Returns', desc: '7 Day Policy' },
                { icon: Award, title: 'Premium Quality', desc: 'Handcrafted' },
              ].map((badge, index) => (
                <div 
                  key={badge.title} 
                  className="flex items-center gap-3"
                  style={{ transitionDelay: `${index * 50}ms` }}
                >
                  <div className="w-10 h-10 rounded-full bg-[#C4A962]/10 flex items-center justify-center">
                    <badge.icon className="w-5 h-5 text-[#C4A962]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{badge.title}</p>
                    <p className="text-white/50 text-xs">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons - Desktop */}
            <div 
              className={`hidden md:flex gap-4 transition-all duration-700 ease-out ${
                animationStage >= 10 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <button
                onClick={handleAddToCart}
                disabled={isAdding || isOutOfStock}
                className={`flex-1 flex items-center justify-center gap-3 py-5 text-sm uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOutOfStock 
                    ? 'bg-white/10 text-white/50' 
                    : 'bg-white/10 text-white border border-white/30 hover:bg-white hover:text-[#1A1A1A]'
                }`}
              >
                {isOutOfStock ? (
                  'Out of Stock'
                ) : added ? (
                  <>
                    <Check className="w-5 h-5" />
                    Added to Bag!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-5 h-5" />
                    {isAdding ? 'Adding...' : 'Add to Bag'}
                  </>
                )}
              </button>
              <button 
                onClick={handleBuyNow}
                disabled={isOutOfStock}
                className={`flex-1 py-5 text-sm uppercase tracking-wider font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isOutOfStock 
                    ? 'bg-white/10 text-white/50' 
                    : 'bg-gradient-to-r from-[#C4A962] to-[#D4B972] text-[#1A1A1A] hover:shadow-lg hover:shadow-[#C4A962]/30 hover:scale-[1.02]'
                }`}
              >
                {isOutOfStock ? 'Unavailable' : 'Buy Now'}
              </button>
              <button 
                onClick={() => setIsWishlisted(!isWishlisted)}
                className={`p-5 transition-all duration-300 ${
                  isWishlisted 
                    ? 'bg-red-500/20 text-red-500 border border-red-500/30' 
                    : 'bg-white/5 text-white/60 border border-white/20 hover:text-red-500 hover:border-red-500/30'
                }`}
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-current' : ''}`} />
              </button>
              <button 
                onClick={handleShare}
                className="p-5 bg-white/5 text-white/60 border border-white/20 hover:text-[#C4A962] hover:border-[#C4A962]/30 transition-all duration-300"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* You Might Also Like Section */}
      {relatedProducts.length > 0 && (
        <div 
          ref={relatedSectionRef}
          className="relative container mx-auto px-4 py-16 md:py-24"
        >
          {/* Section Header */}
          <div className={`text-center mb-12 transition-all duration-700 ${
            relatedVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <p className="text-[#C4A962] text-xs tracking-[0.3em] uppercase mb-3">
              Curated For You
            </p>
            <h2 className="text-white font-serif text-3xl md:text-4xl font-light">
              You Might Also Like
            </h2>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-[#C4A962] to-transparent mx-auto mt-6" />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedProducts.map((relatedProduct, index) => {
              const hasRelatedDiscount = relatedProduct.sale_price && relatedProduct.sale_price < relatedProduct.price
              const relatedDiscountPercent = hasRelatedDiscount 
                ? Math.round((1 - relatedProduct.sale_price! / relatedProduct.price) * 100)
                : 0

              return (
                <TransitionLink
                  key={relatedProduct.id}
                  href={`/products/${relatedProduct.slug}`}
                  imageUrl={relatedProduct.images?.[0]}
                  productName={relatedProduct.title}
                  className={`group relative bg-white/5 backdrop-blur-sm border border-white/10 overflow-hidden transition-all duration-700 hover:border-[#C4A962]/40 ${
                    relatedVisible 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-12'
                  }`}
                  style={{ transitionDelay: relatedVisible ? `${index * 100}ms` : '0ms' }}
                >
                  {/* Discount Badge */}
                  {hasRelatedDiscount && (
                    <div className="absolute top-3 left-3 z-10 bg-red-500 text-white text-xs font-bold px-2 py-1">
                      -{relatedDiscountPercent}%
                    </div>
                  )}

                  {/* Product Image */}
                  <div className="relative aspect-[3/4] overflow-hidden">
                    <Image
                      src={relatedProduct.images?.[0] || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400'}
                      alt={relatedProduct.title}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Quick View */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <span className="bg-white/90 text-[#1A1A1A] px-4 py-2 text-xs uppercase tracking-wider font-semibold transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        Quick View
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <p className="text-[#C4A962]/70 text-xs tracking-wider uppercase mb-1">
                      {relatedProduct.category}
                    </p>
                    <h3 className="text-white font-medium text-sm mb-2 line-clamp-2 group-hover:text-[#C4A962] transition-colors">
                      {relatedProduct.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold">
                        {formatPrice(relatedProduct.sale_price ?? relatedProduct.price)}
                      </span>
                      {hasRelatedDiscount && (
                        <span className="text-white/40 text-sm line-through">
                          {formatPrice(relatedProduct.price)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gold accent line on hover */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#C4A962] to-[#D4B972] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </TransitionLink>
              )
            })}
          </div>

          {/* View All Products Link */}
          <div className={`text-center mt-12 transition-all duration-700 delay-500 ${
            relatedVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <a 
              href="/products"
              className="inline-flex items-center gap-2 text-[#C4A962] hover:text-white transition-colors group"
            >
              <span className="text-sm uppercase tracking-wider">View All Products</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </a>
          </div>
        </div>
      )}

      {/* Mobile Sticky Footer */}
      <div className="fixed bottom-16 left-0 right-0 bg-[#1A1A1A]/95 backdrop-blur-lg border-t border-white/10 md:hidden z-30 p-4">
        {isOutOfStock ? (
          <div className="w-full py-4 bg-white/10 text-white/50 text-center text-sm uppercase tracking-wider font-semibold rounded">
            Out of Stock
          </div>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={handleAddToCart}
              disabled={isAdding}
              className="flex-1 flex items-center justify-center gap-2 border border-white/30 text-white py-4 text-sm uppercase tracking-wider font-semibold disabled:opacity-50"
            >
              {added ? (
                <>
                  <Check className="w-5 h-5" />
                  Added
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Add
                </>
              )}
            </button>
            <button 
              onClick={handleBuyNow}
              className="flex-[2] bg-gradient-to-r from-[#C4A962] to-[#D4B972] text-[#1A1A1A] py-4 text-sm uppercase tracking-wider font-bold"
            >
              Buy Now • {formatPrice(product.sale_price ?? product.price)}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
