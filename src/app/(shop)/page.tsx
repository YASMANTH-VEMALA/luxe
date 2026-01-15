import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import type { Product } from '@/types'
import { 
  ArrowRight, 
  Clock,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { HomePageClient } from './HomePageClient'

// Mock products for when database is empty
const mockProducts: Product[] = [
  {
    id: '1',
    title: 'Gold Plated Kundan Necklace Set',
    slug: 'gold-plated-kundan-necklace-set',
    description: 'Elegant gold plated kundan necklace with matching earrings',
    category: 'Necklaces',
    price: 249900,
    sale_price: 149900,
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=800&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: true,
    stock_quantity: 50,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 23,
    fake_sold_count: 156,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Pearl Drop Earrings',
    slug: 'pearl-drop-earrings',
    description: 'Classic pearl drop earrings with gold finish',
    category: 'Earrings',
    price: 89900,
    sale_price: 59900,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&h=800&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: true,
    stock_quantity: 100,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 18,
    fake_sold_count: 234,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: 'Floral Maxi Dress',
    slug: 'floral-maxi-dress',
    description: 'Beautiful floral print maxi dress perfect for summer',
    category: 'Dresses',
    price: 199900,
    sale_price: 129900,
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=600&h=800&fit=crop'],
    sizes: ['S', 'M', 'L', 'XL'],
    is_active: true,
    is_featured: true,
    stock_quantity: 30,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 31,
    fake_sold_count: 89,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: 'Statement Ring Set',
    slug: 'statement-ring-set',
    description: 'Set of 5 trendy statement rings',
    category: 'Rings',
    price: 79900,
    sale_price: 49900,
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&h=800&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: true,
    stock_quantity: 75,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 14,
    fake_sold_count: 312,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: 'Silk Wrap Dress',
    slug: 'silk-wrap-dress',
    description: 'Elegant silk wrap dress for special occasions',
    category: 'Dresses',
    price: 349900,
    sale_price: 249900,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600&h=800&fit=crop'],
    sizes: ['XS', 'S', 'M', 'L'],
    is_active: true,
    is_featured: true,
    stock_quantity: 20,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 42,
    fake_sold_count: 67,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Crystal Pendant Necklace',
    slug: 'crystal-pendant-necklace',
    description: 'Stunning crystal pendant with silver chain',
    category: 'Necklaces',
    price: 129900,
    sale_price: 89900,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&h=800&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: true,
    stock_quantity: 60,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 27,
    fake_sold_count: 198,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const mockCategories = [
  { id: '1', name: 'Necklaces', slug: 'necklaces', image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400&h=500&fit=crop' },
  { id: '2', name: 'Earrings', slug: 'earrings', image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400&h=500&fit=crop' },
  { id: '3', name: 'Dresses', slug: 'dresses', image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&h=500&fit=crop' },
  { id: '4', name: 'Rings', slug: 'rings', image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400&h=500&fit=crop' },
]

export default async function HomePage() {
  let featuredProducts: Product[] = mockProducts
  let categories = mockCategories

  try {
    const supabase = await createClient()
    
    const { data: dbProducts } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .eq('is_featured', true)
      .limit(6)
    
    const { data: dbCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (dbProducts && dbProducts.length > 0) {
      featuredProducts = dbProducts
    }
    if (dbCategories && dbCategories.length > 0) {
      categories = dbCategories
    }
  } catch (error) {
    console.log('Using mock data - database not connected')
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2]">
      {/* Hero Section - Full Screen Immersive */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Background Video/Image with Ken Burns Effect */}
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=1920&h=1080&fit=crop"
            alt="Luxe Collection"
            fill
            className="object-cover scale-105 animate-slow-zoom"
            priority
          />
          {/* Elegant Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Floating Announcement Strip */}
        <div className="absolute top-0 left-0 right-0 z-20 bg-[#C4A962]/90 backdrop-blur-sm">
          <div className="flex items-center justify-center gap-3 py-2.5 text-[#1A1A1A]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs md:text-sm font-semibold tracking-wider uppercase">
              Grand Sale Live • Up to 50% Off + Free Shipping
            </span>
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        {/* Main Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="container mx-auto px-6 md:px-12">
            <div className="max-w-2xl">
              {/* Animated Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 mb-6 animate-fade-in-up">
                <span className="w-2 h-2 bg-[#C4A962] rounded-full animate-pulse" />
                <span className="text-white/90 text-xs md:text-sm tracking-wider uppercase">
                  New Collection 2026
                </span>
              </div>

              {/* Main Headline */}
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif text-white font-light leading-[0.9] mb-6 animate-fade-in-up animation-delay-100">
                Elegance
                <span className="block text-[#C4A962] italic">Redefined</span>
              </h1>

              {/* Subheadline */}
              <p className="text-white/80 text-lg md:text-xl leading-relaxed mb-8 max-w-lg animate-fade-in-up animation-delay-200">
                Discover handcrafted jewelry & designer dresses that transform moments into memories. 
                <span className="text-[#C4A962] font-medium"> Made for women who shine.</span>
              </p>

              {/* Urgency Banner */}
              <div className="flex flex-wrap items-center gap-4 mb-8 animate-fade-in-up animation-delay-300">
                <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 text-sm font-bold">
                  <Clock className="w-4 h-4" />
                  <span>SALE ENDS TODAY</span>
                </div>
                <div className="flex items-center gap-2 text-white/90 text-sm">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>2,847 people shopping now</span>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up animation-delay-400">
                <Link 
                  href="/products" 
                  className="group inline-flex items-center justify-center gap-3 bg-[#C4A962] text-[#1A1A1A] px-8 py-4 text-sm tracking-wider uppercase font-bold hover:bg-white transition-all duration-300"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/products?category=new-arrivals" 
                  className="group inline-flex items-center justify-center gap-3 border-2 border-white/50 text-white px-8 py-4 text-sm tracking-wider uppercase font-medium hover:bg-white hover:text-[#1A1A1A] transition-all duration-300"
                >
                  New Arrivals
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>

              {/* Quick Stats */}
              <div className="flex gap-8 mt-12 pt-8 border-t border-white/20 animate-fade-in-up animation-delay-500">
                <div>
                  <p className="text-3xl md:text-4xl font-serif text-[#C4A962]">50k+</p>
                  <p className="text-white/60 text-xs uppercase tracking-wider mt-1">Happy Customers</p>
                </div>
                <div>
                  <p className="text-3xl md:text-4xl font-serif text-[#C4A962]">4.9★</p>
                  <p className="text-white/60 text-xs uppercase tracking-wider mt-1">Average Rating</p>
                </div>
                <div className="hidden sm:block">
                  <p className="text-3xl md:text-4xl font-serif text-[#C4A962]">500+</p>
                  <p className="text-white/60 text-xs uppercase tracking-wider mt-1">Unique Designs</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Featured Product Card - Floating */}
        <div className="hidden lg:block absolute right-12 top-1/2 -translate-y-1/2 z-10 animate-fade-in-left animation-delay-500">
          <div className="bg-white/95 backdrop-blur-md p-4 shadow-2xl w-72">
            <div className="relative aspect-[3/4] mb-4 overflow-hidden group">
              <Image
                src={featuredProducts[0]?.images?.[0] || "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600&h=800&fit=crop"}
                alt="Featured Product"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 sale-tag text-xs">
                BESTSELLER
              </div>
            </div>
            <p className="text-[10px] text-[#C4A962] uppercase tracking-wider mb-1">Featured</p>
            <h3 className="font-medium text-[#1A1A1A] text-sm mb-2 line-clamp-1">
              {featuredProducts[0]?.title || "Gold Kundan Necklace"}
            </h3>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg font-bold text-[#1A1A1A]">
                {formatPrice(featuredProducts[0]?.sale_price || featuredProducts[0]?.price || 149900)}
              </span>
              {featuredProducts[0]?.sale_price && (
                <span className="text-sm text-[#8B8178] line-through">
                  {formatPrice(featuredProducts[0]?.price || 249900)}
                </span>
              )}
            </div>
            <Link 
              href={`/products/${featuredProducts[0]?.slug || 'gold-plated-kundan-necklace-set'}`}
              className="block w-full text-center bg-[#1A1A1A] text-white py-2.5 text-xs uppercase tracking-wider font-medium hover:bg-[#C4A962] hover:text-[#1A1A1A] transition-all"
            >
              Quick View
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <span className="text-xs uppercase tracking-widest">Scroll</span>
            <div className="w-6 h-10 border-2 border-white/40 rounded-full flex justify-center pt-2">
              <div className="w-1.5 h-3 bg-white/60 rounded-full animate-scroll-down" />
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-[#C4A962]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-[#C4A962]/5 rounded-full blur-3xl" />
      </section>

      {/* Client-side sections with scroll animations */}
      <HomePageClient featuredProducts={featuredProducts} categories={categories} />
    </div>
  )
}
