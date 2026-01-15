import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProductDetailClient } from './ProductDetailClient'
import type { Metadata } from 'next'
import type { Product } from '@/types'

interface ProductPageProps {
  params: Promise<{ slug: string }>
}

// Mock products for fallback
const mockProducts: Record<string, Product> = {
  'gold-plated-kundan-necklace-set': {
    id: '1',
    title: 'Gold Plated Kundan Necklace Set',
    slug: 'gold-plated-kundan-necklace-set',
    description: 'Elegant gold plated kundan necklace with matching earrings. Perfect for weddings and special occasions. This stunning piece features intricate kundan work with beautiful gold plating that gives a luxurious finish. The set includes a necklace and matching earrings.',
    category: 'Necklaces',
    price: 249900,
    sale_price: 149900,
    images: [
      'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=1000&fit=crop',
    ],
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
  'pearl-drop-earrings': {
    id: '2',
    title: 'Pearl Drop Earrings',
    slug: 'pearl-drop-earrings',
    description: 'Classic pearl drop earrings with gold finish. Timeless elegance for any occasion. These beautiful earrings feature genuine freshwater pearls set in gold-plated brass.',
    category: 'Earrings',
    price: 89900,
    sale_price: 59900,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=800&h=1000&fit=crop'],
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
  'floral-maxi-dress': {
    id: '3',
    title: 'Floral Maxi Dress',
    slug: 'floral-maxi-dress',
    description: 'Beautiful floral print maxi dress perfect for summer outings and beach vacations. Made from breathable cotton fabric with a flattering A-line silhouette.',
    category: 'Dresses',
    price: 199900,
    sale_price: 129900,
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=800&h=1000&fit=crop'],
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
  'statement-ring-set': {
    id: '4',
    title: 'Statement Ring Set',
    slug: 'statement-ring-set',
    description: 'Set of 5 trendy statement rings. Mix and match for different looks. Each ring is adjustable to fit most finger sizes.',
    category: 'Rings',
    price: 79900,
    sale_price: 49900,
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=1000&fit=crop'],
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
  'silk-wrap-dress': {
    id: '5',
    title: 'Silk Wrap Dress',
    slug: 'silk-wrap-dress',
    description: 'Elegant silk wrap dress for special occasions. Flattering fit for all body types. The wrap design allows for easy adjustment.',
    category: 'Dresses',
    price: 349900,
    sale_price: 249900,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&h=1000&fit=crop'],
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
  'crystal-pendant-necklace': {
    id: '6',
    title: 'Crystal Pendant Necklace',
    slug: 'crystal-pendant-necklace',
    description: 'Stunning crystal pendant with silver chain. Adds sparkle to any outfit. The pendant features a genuine Swarovski crystal.',
    category: 'Necklaces',
    price: 129900,
    sale_price: 89900,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=1000&fit=crop'],
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
  'bohemian-bracelet-stack': {
    id: '7',
    title: 'Bohemian Bracelet Stack',
    slug: 'bohemian-bracelet-stack',
    description: 'Set of 4 bohemian style bracelets. Perfect for layering. Mix metals and textures for a boho-chic look.',
    category: 'Bracelets',
    price: 69900,
    sale_price: 44900,
    images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=800&h=1000&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: false,
    stock_quantity: 80,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 19,
    fake_sold_count: 145,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'off-shoulder-evening-gown': {
    id: '8',
    title: 'Off-Shoulder Evening Gown',
    slug: 'off-shoulder-evening-gown',
    description: 'Stunning off-shoulder evening gown. Make a statement at any event. Features a flowing silhouette with elegant draping.',
    category: 'Dresses',
    price: 499900,
    sale_price: 349900,
    images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&h=1000&fit=crop'],
    sizes: ['S', 'M', 'L'],
    is_active: true,
    is_featured: false,
    stock_quantity: 15,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 56,
    fake_sold_count: 34,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'diamond-studs-ad': {
    id: '9',
    title: 'Diamond Studs (AD)',
    slug: 'diamond-studs-ad',
    description: 'American diamond stud earrings. Everyday elegance. These studs sparkle like real diamonds.',
    category: 'Earrings',
    price: 59900,
    sale_price: 39900,
    images: ['https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=800&h=1000&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: false,
    stock_quantity: 120,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 11,
    fake_sold_count: 456,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  'layered-gold-chain': {
    id: '10',
    title: 'Layered Gold Chain',
    slug: 'layered-gold-chain',
    description: 'Trendy layered gold chain necklace. Instagram worthy accessory. Features multiple chains of varying lengths.',
    category: 'Necklaces',
    price: 159900,
    sale_price: 99900,
    images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=1000&fit=crop'],
    sizes: null,
    is_active: true,
    is_featured: false,
    stock_quantity: 45,
    low_stock_threshold: 10,
    show_stock_count: false,
    fake_viewers: 33,
    fake_sold_count: 178,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params
  
  // Try mock first for demo
  if (mockProducts[slug]) {
    const product = mockProducts[slug]
    return {
      title: `${product.title} | Luxe`,
      description: product.description || `Shop ${product.title} at Luxe`,
      openGraph: {
        title: product.title,
        description: product.description || `Shop ${product.title} at Luxe`,
        images: product.images?.[0] ? [product.images[0]] : [],
      },
    }
  }

  try {
    const supabase = await createClient()
    
    const { data: product } = await supabase
      .from('products')
      .select('title, description, images')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (!product) {
      return { title: 'Product Not Found' }
    }

    return {
      title: `${product.title} | Luxe`,
      description: product.description || `Shop ${product.title} at Luxe`,
      openGraph: {
        title: product.title,
        description: product.description || `Shop ${product.title} at Luxe`,
        images: product.images?.[0] ? [product.images[0]] : [],
      },
    }
  } catch {
    return { title: 'Product Not Found' }
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params
  
  // Try mock first for demo
  if (mockProducts[slug]) {
    const currentProduct = mockProducts[slug]
    // Get related products (same category or featured, excluding current)
    const relatedProducts = Object.values(mockProducts)
      .filter(p => p.slug !== slug)
      .filter(p => p.category === currentProduct.category || p.is_featured)
      .slice(0, 6)
    
    return <ProductDetailClient product={currentProduct} relatedProducts={relatedProducts} />
  }

  try {
    const supabase = await createClient()
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error || !product) {
      notFound()
    }

    // Fetch related products (same category or featured)
    const { data: relatedProducts } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .neq('slug', slug)
      .or(`category.eq.${product.category},is_featured.eq.true`)
      .limit(6)

    return <ProductDetailClient product={product} relatedProducts={relatedProducts || []} />
  } catch {
    notFound()
  }
}
