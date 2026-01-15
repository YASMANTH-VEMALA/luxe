'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { 
  ArrowRight, 
  Truck, 
  Shield, 
  RotateCcw, 
  Award,
  Star,
  ChevronRight,
  Eye
} from 'lucide-react'
import { ScrollReveal, AnimatedCounter } from '@/components/ui/scroll-reveal'
import { TransitionLink, usePageTransition } from '@/components/ui/page-transition'

interface Category {
  id: string
  name: string
  slug: string
  image_url?: string
}

interface HomePageClientProps {
  featuredProducts: Product[]
  categories: Category[]
}

export function HomePageClient({ featuredProducts, categories }: HomePageClientProps) {
  return (
    <>
      {/* Trust Badges - Premium Style */}
      <section className="bg-white border-y border-[#E8E4DD] overflow-hidden">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { icon: Truck, title: 'Free Delivery', desc: 'On orders ₹499+' },
              { icon: Shield, title: 'Secure Payment', desc: '100% Protected' },
              { icon: RotateCcw, title: 'Easy Returns', desc: '7 Day Policy' },
              { icon: Award, title: 'Premium Quality', desc: 'Handcrafted' },
            ].map((badge, index) => (
              <ScrollReveal key={badge.title} delay={index * 100} direction="up">
                <div className="flex flex-col md:flex-row items-center gap-3 text-center md:text-left">
                  <div className="w-12 h-12 rounded-full bg-[#FAF7F2] flex items-center justify-center">
                    <badge.icon className="w-5 h-5 text-[#C4A962]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#1A1A1A] text-sm uppercase tracking-wide">{badge.title}</p>
                    <p className="text-xs text-[#8B8178]">{badge.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Editorial Grid */}
      <section className="py-16 md:py-24 bg-[#FAF7F2]">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="text-center mb-12 md:mb-16">
              <p className="text-[#C4A962] text-xs tracking-[0.3em] uppercase mb-3">Explore</p>
              <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light">
                Shop by Category
              </h2>
            </div>
          </ScrollReveal>
          
          <div className={`grid gap-4 md:gap-6 ${
            categories?.length === 1 ? 'grid-cols-1 max-w-md mx-auto' :
            categories?.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
            categories?.length === 3 ? 'grid-cols-3' :
            'grid-cols-2 md:grid-cols-4'
          }`}>
            {categories?.map((category, index) => (
              <ScrollReveal key={category.id} delay={index * 100} direction="up">
                <Link 
                  href={`/products?category=${category.slug}`}
                  className="group relative overflow-hidden block"
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={category.image_url || 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400'}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    {/* Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent group-hover:from-black/80 transition-all duration-300" />
                    
                    {/* Content */}
                    <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6">
                      <h3 className="font-serif text-white text-xl md:text-2xl font-medium mb-1 group-hover:translate-y-0 translate-y-2 transition-transform duration-300">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-1 text-white/80 text-sm group-hover:text-[#C4A962] transition-all duration-300 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0">
                        <span>Explore</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                    
                    {/* Hover border effect */}
                    <div className="absolute inset-0 border-2 border-[#C4A962] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products - Premium Grid */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="flex items-end justify-between mb-12 md:mb-16">
              <div>
                <p className="text-[#C4A962] text-xs tracking-[0.3em] uppercase mb-3">Bestsellers</p>
                <h2 className="font-serif text-4xl md:text-5xl text-[#1A1A1A] font-light">
                  Trending Now
                </h2>
              </div>
              <Link 
                href="/products" 
                className="hidden md:flex items-center gap-2 text-sm text-[#1A1A1A] hover:text-[#C4A962] transition-colors uppercase tracking-wider group"
              >
                View All
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
            {featuredProducts?.slice(0, 6).map((product, index) => (
              <ScrollReveal key={product.id} delay={index * 100} direction="up">
                <ProductCard product={product} />
              </ScrollReveal>
            ))}
          </div>

          {/* Mobile View All */}
          <ScrollReveal direction="up" delay={300}>
            <div className="mt-10 md:hidden text-center">
              <Link 
                href="/products" 
                className="inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-8 py-4 text-sm uppercase tracking-wider font-medium hover:bg-[#C4A962] hover:text-[#1A1A1A] transition-all"
              >
                View All Products
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Editorial Banner - Parallax Effect */}
      <section className="relative h-[60vh] md:h-[80vh] overflow-hidden">
        <div className="absolute inset-0 scale-110">
          <Image
            src="https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=1600&h=900&fit=crop"
            alt="The Mahal Collection"
            fill
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-black/60" />
        
        <div className="absolute inset-0 flex items-center justify-center text-center px-4">
          <ScrollReveal direction="zoom">
            <div className="max-w-2xl">
              <div className="inline-block bg-[#C4A962] text-[#1A1A1A] px-4 py-2 text-xs font-bold uppercase tracking-wider mb-6">
                Limited Time Offer
              </div>
              <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl text-white font-light mb-6 leading-tight">
                Ethnic <span className="italic text-[#C4A962]">Elegance</span>
              </h2>
              <p className="text-white/80 text-base md:text-lg mb-8 max-w-lg mx-auto">
                Discover our curated collection of ethnic dresses and traditional jewelry. 
                Perfect for weddings, festivals, and celebrations.
              </p>
              <Link 
                href="/products?category=dresses" 
                className="inline-flex items-center gap-3 bg-white text-[#1A1A1A] px-8 py-4 text-sm tracking-wider uppercase font-bold hover:bg-[#C4A962] transition-all duration-300 group"
              >
                Shop Ethnic Wear
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Social Proof Section with Animated Counters */}
      <section className="py-16 md:py-24 bg-[#1A1A1A] text-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center">
            {[
              { value: 50000, suffix: '+', label: 'Happy Customers' },
              { value: 4.9, suffix: '★', label: 'Average Rating', isDecimal: true },
              { value: 500, suffix: '+', label: '5-Star Reviews' },
              { value: 1000, suffix: '+', label: 'Products Sold' },
            ].map((stat, index) => (
              <ScrollReveal key={stat.label} delay={index * 150} direction="up">
                <div className="relative group">
                  <div className="absolute inset-0 bg-[#C4A962]/10 rounded-2xl scale-0 group-hover:scale-100 transition-transform duration-500" />
                  <div className="relative p-6">
                    <p className="text-5xl md:text-6xl font-serif text-[#C4A962] mb-3">
                      {stat.isDecimal ? stat.value : (
                        <AnimatedCounter end={stat.value} suffix={stat.suffix} duration={2500} />
                      )}
                      {stat.isDecimal && stat.suffix}
                    </p>
                    {stat.label === 'Average Rating' && (
                      <div className="flex items-center justify-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-[#C4A962] text-[#C4A962]" />
                        ))}
                      </div>
                    )}
                    <p className="text-sm uppercase tracking-wider text-white/70">{stat.label}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Marquee */}
      <section className="py-4 bg-[#C4A962] overflow-hidden">
        <div className="animate-marquee whitespace-nowrap flex">
          {[...Array(10)].map((_, i) => (
            <span key={i} className="mx-8 text-[#1A1A1A] font-bold uppercase tracking-widest text-sm">
              ✦ New Arrivals ✦ Free Shipping ✦ COD Available ✦ Premium Quality
            </span>
          ))}
        </div>
      </section>

      {/* Instagram CTA */}
      <section className="py-16 md:py-24 bg-[#FAF7F2]">
        <div className="container mx-auto px-4 text-center">
          <ScrollReveal direction="up">
            <p className="text-[#C4A962] text-xs tracking-[0.3em] uppercase mb-3">Join the Community</p>
            <h2 className="font-serif text-3xl md:text-4xl text-[#1A1A1A] font-light mb-4">
              @luxe.store
            </h2>
            <p className="text-[#8B8178] text-sm mb-8 max-w-md mx-auto">
              Join our community for exclusive offers, style inspiration, and early access to new collections.
            </p>
          </ScrollReveal>
          
          {/* Instagram Grid Mockup */}
          <ScrollReveal direction="up" delay={200}>
            <div className="grid grid-cols-4 md:grid-cols-6 gap-2 mb-8 max-w-4xl mx-auto">
              {[
                'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop',
                'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=300&h=300&fit=crop',
              ].map((img, i) => (
                <div key={i} className="relative aspect-square overflow-hidden group cursor-pointer">
                  <Image
                    src={img}
                    alt="Instagram"
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <Star className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
          
          <ScrollReveal direction="up" delay={400}>
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 via-pink-500 to-orange-400 text-white px-8 py-4 text-sm tracking-wider uppercase font-bold hover:opacity-90 transition-all duration-300"
            >
              Follow on Instagram
            </a>
          </ScrollReveal>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="py-16 md:py-20 bg-[#1A1A1A]">
        <div className="container mx-auto px-4">
          <ScrollReveal direction="up">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="font-serif text-3xl md:text-4xl text-white font-light mb-4">
                Get <span className="text-[#C4A962] italic">10% Off</span> Your First Order
              </h2>
              <p className="text-white/70 text-sm mb-8">
                Subscribe to our newsletter and be the first to know about new arrivals, exclusive offers, and style tips.
              </p>
              <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-4 bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:border-[#C4A962] transition-colors"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-[#C4A962] text-[#1A1A1A] font-bold uppercase tracking-wider hover:bg-white transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  )
}

// Product Card with Transition Effect
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
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F2ED] mb-4">
        {(product.images?.[0] || imageError) ? (
          <Image
            src={imageError ? fallbackImage : product.images[0]}
            alt={product.title}
            fill
            className={`object-cover transition-all duration-700 group-hover:scale-110 ${isOutOfStock ? 'opacity-50 grayscale' : ''}`}
            sizes="(max-width: 768px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#8B8178]">
            No Image
          </div>
        )}
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
        
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
          <div className="absolute top-3 left-3">
            <span className="bg-red-600 text-white px-3 py-1.5 text-xs font-bold uppercase">
              -{discountPercent}%
            </span>
          </div>
        )}
        
        {/* Low Stock Badge */}
        {isLowStock && product.show_stock_count && (
          <span className="absolute top-3 right-3 bg-orange-500 text-white px-2 py-1 text-[10px] uppercase tracking-wider font-bold animate-pulse">
            Only {product.stock_quantity} left
          </span>
        )}

        {/* Quick View Button */}
        {!isOutOfStock && (
          <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
            <div className="bg-white text-[#1A1A1A] text-center py-3 text-xs uppercase tracking-wider font-bold hover:bg-[#C4A962] transition-colors">
              Quick View
            </div>
          </div>
        )}

        {/* Viewers Badge - only show if in stock */}
        {!isOutOfStock && product.fake_viewers && product.fake_viewers > 0 && (
          <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1.5 text-xs text-[#1A1A1A] flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {product.fake_viewers} viewing
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="space-y-2">
        <p className="text-[10px] text-[#C4A962] uppercase tracking-[0.15em]">
          {product.category}
        </p>
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
            <span className="text-sm text-[#8B8178] line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>
      </div>
    </TransitionLink>
  )
}
