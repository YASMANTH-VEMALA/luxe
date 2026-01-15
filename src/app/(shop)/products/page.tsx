import { createClient } from '@/lib/supabase/server'
import { ProductsClient } from './ProductsClient'
import type { Product } from '@/types'

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string
    sort?: string
    minPrice?: string
    maxPrice?: string
  }>
}

// Mock products data
const mockProducts: Product[] = [
  {
    id: '1',
    title: 'Gold Plated Kundan Necklace Set',
    slug: 'gold-plated-kundan-necklace-set',
    description: 'Elegant gold plated kundan necklace with matching earrings. Perfect for weddings and special occasions.',
    category: 'Necklaces',
    price: 249900,
    sale_price: 149900,
    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500&h=600&fit=crop'],
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
    description: 'Classic pearl drop earrings with gold finish. Timeless elegance for any occasion.',
    category: 'Earrings',
    price: 89900,
    sale_price: 59900,
    images: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500&h=600&fit=crop'],
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
    description: 'Beautiful floral print maxi dress perfect for summer outings and beach vacations.',
    category: 'Dresses',
    price: 199900,
    sale_price: 129900,
    images: ['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500&h=600&fit=crop'],
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
    description: 'Set of 5 trendy statement rings. Mix and match for different looks.',
    category: 'Rings',
    price: 79900,
    sale_price: 49900,
    images: ['https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&h=600&fit=crop'],
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
    description: 'Elegant silk wrap dress for special occasions. Flattering fit for all body types.',
    category: 'Dresses',
    price: 349900,
    sale_price: 249900,
    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500&h=600&fit=crop'],
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
    description: 'Stunning crystal pendant with silver chain. Adds sparkle to any outfit.',
    category: 'Necklaces',
    price: 129900,
    sale_price: 89900,
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=500&h=600&fit=crop'],
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
  {
    id: '7',
    title: 'Bohemian Bracelet Stack',
    slug: 'bohemian-bracelet-stack',
    description: 'Set of 4 bohemian style bracelets. Perfect for layering.',
    category: 'Bracelets',
    price: 69900,
    sale_price: 44900,
    images: ['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500&h=600&fit=crop'],
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
  {
    id: '8',
    title: 'Off-Shoulder Evening Gown',
    slug: 'off-shoulder-evening-gown',
    description: 'Stunning off-shoulder evening gown. Make a statement at any event.',
    category: 'Dresses',
    price: 499900,
    sale_price: 349900,
    images: ['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500&h=600&fit=crop'],
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
  {
    id: '9',
    title: 'Diamond Studs (AD)',
    slug: 'diamond-studs-ad',
    description: 'American diamond stud earrings. Everyday elegance.',
    category: 'Earrings',
    price: 59900,
    sale_price: 39900,
    images: ['https://images.unsplash.com/photo-1588444837495-c6cfeb53f32d?w=500&h=600&fit=crop'],
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
  {
    id: '10',
    title: 'Layered Gold Chain',
    slug: 'layered-gold-chain',
    description: 'Trendy layered gold chain necklace. Instagram worthy accessory.',
    category: 'Necklaces',
    price: 159900,
    sale_price: 99900,
    images: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500&h=600&fit=crop'],
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
]

const mockCategories = [
  { id: '1', name: 'Necklaces', slug: 'necklaces', description: null, image_url: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', display_order: 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', name: 'Earrings', slug: 'earrings', description: null, image_url: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500', display_order: 2, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', name: 'Dresses', slug: 'dresses', description: null, image_url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', display_order: 3, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', name: 'Rings', slug: 'rings', description: null, image_url: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500', display_order: 4, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '5', name: 'Bracelets', slug: 'bracelets', description: null, image_url: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500', display_order: 5, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
]

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams
  let products: Product[] = mockProducts
  let categories = mockCategories

  try {
    const supabase = await createClient()
    
    // Build query
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .range(0, 9) // First 10 products

    if (params.category) {
      query = query.ilike('category', params.category)
    }
    if (params.minPrice) {
      query = query.gte('price', parseInt(params.minPrice) * 100)
    }
    if (params.maxPrice) {
      query = query.lte('price', parseInt(params.maxPrice) * 100)
    }

    // Sort
    switch (params.sort) {
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

    const { data: dbProducts } = await query

    // Fetch categories
    const { data: dbCategories } = await supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (dbProducts && dbProducts.length > 0) {
      products = dbProducts
    }
    if (dbCategories && dbCategories.length > 0) {
      categories = dbCategories
    }
  } catch (error) {
    console.log('Using mock data - database not connected')
    
    // Apply filters to mock data
    if (params.category) {
      products = products.filter(p => 
        p.category.toLowerCase() === params.category?.toLowerCase()
      )
    }
    if (params.sort === 'price_asc') {
      products = [...products].sort((a, b) => (a.sale_price || a.price) - (b.sale_price || b.price))
    } else if (params.sort === 'price_desc') {
      products = [...products].sort((a, b) => (b.sale_price || b.price) - (a.sale_price || a.price))
    } else if (params.sort === 'popular') {
      products = [...products].sort((a, b) => (b.fake_sold_count || 0) - (a.fake_sold_count || 0))
    }
  }

  return (
    <ProductsClient 
      initialProducts={products} 
      categories={categories}
      searchParams={params}
    />
  )
}

export const dynamic = 'force-dynamic'
