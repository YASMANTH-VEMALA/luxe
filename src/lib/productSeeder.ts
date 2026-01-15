import { createAdminClient } from '@/lib/supabase/server'

// Product interface for our database
interface ProductToSeed {
  title: string
  slug: string
  description: string
  price: number
  sale_price: number | null
  images: string[]
  category: string // TEXT field in database
  stock_quantity: number
  sizes: string[]
  is_active: boolean
  is_featured: boolean
}

// Generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100)
}

// Fetch from DummyJSON API - Best quality with multiple images
async function fetchDummyJSON(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    const response = await fetch('https://dummyjson.com/products?limit=100')
    const data = await response.json()
    
    for (const p of data.products) {
      // Skip products with bad/placeholder images
      if (!p.images || p.images.length === 0) continue
      
      // DummyJSON has good multi-image support
      const images = p.images.filter((img: string) => 
        img && !img.includes('placeholder') && img.startsWith('http')
      )
      
      if (images.length === 0) continue
      
      // Convert USD to INR (approx 83 INR per USD)
      const priceInPaise = Math.round(p.price * 83 * 100)
      const hasDiscount = p.discountPercentage > 5
      const salePriceInPaise = hasDiscount 
        ? Math.round(priceInPaise * (1 - p.discountPercentage / 100))
        : null
      
      products.push({
        title: p.title,
        slug: generateSlug(p.title) + '-' + Date.now().toString(36).slice(-4),
        description: p.description || `${p.title} - High quality product from ${p.brand || 'Premium Brand'}`,
        price: priceInPaise,
        sale_price: salePriceInPaise,
        images: images,
        category: p.category || 'Imported',
        stock_quantity: p.stock || Math.floor(Math.random() * 50) + 10,
        sizes: ['S', 'M', 'L', 'XL'],
        is_active: true,
        is_featured: p.rating > 4.5,
      })
    }
  } catch (error) {
    console.error('DummyJSON fetch error:', error)
  }
  
  return products
}

// Fetch from FakeStore API - Good for jewelry and clothing
async function fetchFakeStore(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    const response = await fetch('https://fakestoreapi.com/products')
    const data = await response.json()
    
    for (const p of data) {
      if (!p.image) continue
      
      // FakeStore only has single image, but they're good quality
      const priceInPaise = Math.round(p.price * 83 * 100)
      const hasDiscount = Math.random() > 0.6
      const salePriceInPaise = hasDiscount 
        ? Math.round(priceInPaise * 0.85)
        : null
      
      products.push({
        title: p.title.substring(0, 100),
        slug: generateSlug(p.title) + '-fs-' + Date.now().toString(36).slice(-4),
        description: p.description,
        price: priceInPaise,
        sale_price: salePriceInPaise,
        images: [p.image],
        category: p.category || 'Imported',
        stock_quantity: Math.floor(Math.random() * 50) + 10,
        sizes: p.category.includes('clothing') ? ['S', 'M', 'L', 'XL'] : ['One Size'],
        is_active: true,
        is_featured: p.rating?.rate > 4,
      })
    }
  } catch (error) {
    console.error('FakeStore fetch error:', error)
  }
  
  return products
}

// Fetch from Escuela/Platzi API - Good variety with Unsplash images
async function fetchEscuela(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    const response = await fetch('https://api.escuelajs.co/api/v1/products?limit=50')
    const data = await response.json()
    
    for (const p of data) {
      // Filter out products with placeholder or invalid images
      const images = (p.images || []).filter((img: string) => {
        if (!img || typeof img !== 'string') return false
        // Remove placeholder and invalid URLs
        if (img.includes('placeimg') || img.includes('placeholder')) return false
        if (img.includes('[') || img.includes(']')) return false
        if (!img.startsWith('http')) return false
        return true
      })
      
      if (images.length === 0) continue
      
      const priceInPaise = Math.round(p.price * 83 * 100)
      const hasDiscount = Math.random() > 0.5
      const salePriceInPaise = hasDiscount 
        ? Math.round(priceInPaise * (0.75 + Math.random() * 0.15))
        : null
      
      products.push({
        title: p.title.substring(0, 100),
        slug: generateSlug(p.title) + '-es-' + Date.now().toString(36).slice(-4),
        description: p.description || `Premium ${p.title} - Quality assured`,
        price: priceInPaise,
        sale_price: salePriceInPaise,
        images: images.slice(0, 5),
        category: p.category?.name || 'Imported',
        stock_quantity: Math.floor(Math.random() * 50) + 10,
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        is_active: true,
        is_featured: Math.random() > 0.7,
      })
    }
  } catch (error) {
    console.error('Escuela fetch error:', error)
  }
  
  return products
}

// Main seeding function
export async function seedProductsFromAPIs(): Promise<{
  success: boolean
  imported: number
  errors: string[]
}> {
  const errors: string[] = []
  let imported = 0
  
  const adminClient = createAdminClient()
  
  // Fetch from all APIs
  console.log('Fetching from DummyJSON...')
  const dummyProducts = await fetchDummyJSON()
  console.log(`Got ${dummyProducts.length} from DummyJSON`)
  
  console.log('Fetching from FakeStore...')
  const fakeStoreProducts = await fetchFakeStore()
  console.log(`Got ${fakeStoreProducts.length} from FakeStore`)
  
  console.log('Fetching from Escuela...')
  const escuelaProducts = await fetchEscuela()
  console.log(`Got ${escuelaProducts.length} from Escuela`)
  
  const allProducts = [...dummyProducts, ...fakeStoreProducts, ...escuelaProducts]
  console.log(`Total products to import: ${allProducts.length}`)
  
  // Insert products in batches
  const batchSize = 10
  for (let i = 0; i < allProducts.length; i += batchSize) {
    const batch = allProducts.slice(i, i + batchSize)
    
    const { data, error } = await adminClient
      .from('products')
      .insert(batch)
      .select('id')
    
    if (error) {
      errors.push(`Batch ${i / batchSize + 1} error: ${error.message}`)
    } else if (data) {
      imported += data.length
    }
  }
  
  return {
    success: errors.length === 0,
    imported,
    errors,
  }
}

// Clear imported products (clears products with slug patterns from APIs)
export async function clearImportedProducts(): Promise<{
  success: boolean
  deleted: number
  error?: string
}> {
  const adminClient = createAdminClient()
  
  // Delete products that have API slug patterns (-fs-, -es-, or dummyjson patterns)
  const { data, error } = await adminClient
    .from('products')
    .delete()
    .or('slug.like.%-fs-%,slug.like.%-es-%,category.in.(beauty,fragrances,furniture,groceries,home-decoration,kitchen-accessories,laptops,mens-shirts,mens-shoes,mens-watches,mobile-accessories,motorcycle,skin-care,smartphones,sports-accessories,sunglasses,tablets,tops,vehicle,womens-bags,womens-dresses,womens-jewellery,womens-shoes,womens-watches)')
    .select('id')
  
  if (error) {
    return { success: false, deleted: 0, error: error.message }
  }
  
  return { success: true, deleted: data?.length || 0 }
}

// Get count of imported products
export async function getImportedProductsCount(): Promise<number> {
  const adminClient = createAdminClient()
  
  const { count } = await adminClient
    .from('products')
    .select('*', { count: 'exact', head: true })
    .or('slug.like.%-fs-%,slug.like.%-es-%,category.in.(beauty,fragrances,furniture,groceries,home-decoration,kitchen-accessories,laptops,mens-shirts,mens-shoes,mens-watches,mobile-accessories,motorcycle,skin-care,smartphones,sports-accessories,sunglasses,tablets,tops,vehicle,womens-bags,womens-dresses,womens-jewellery,womens-shoes,womens-watches)')
  
  return count || 0
}
