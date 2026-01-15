// Script to seed products - run with: npx tsx scripts/seed-products.ts
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  console.error('URL:', supabaseUrl ? 'Found' : 'Missing')
  console.error('Key:', supabaseServiceKey ? 'Found' : 'Missing')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 100)
}

async function fetchDummyJSON(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    console.log('Fetching from DummyJSON...')
    const response = await fetch('https://dummyjson.com/products?limit=100')
    const data = await response.json()
    
    for (const p of data.products) {
      if (!p.images || p.images.length === 0) continue
      
      const images = p.images.filter((img: string) => 
        img && !img.includes('placeholder') && img.startsWith('http')
      )
      
      if (images.length === 0) continue
      
      const priceInPaise = Math.round(p.price * 83 * 100)
      const hasDiscount = p.discountPercentage > 5
      const salePriceInPaise = hasDiscount 
        ? Math.round(priceInPaise * (1 - p.discountPercentage / 100))
        : null
      
      products.push({
        title: p.title,
        slug: generateSlug(p.title) + '-' + Date.now().toString(36).slice(-4),
        description: p.description || `${p.title} - High quality product`,
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
    console.log(`Got ${products.length} products from DummyJSON`)
  } catch (error) {
    console.error('DummyJSON fetch error:', error)
  }
  
  return products
}

async function fetchFakeStore(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    console.log('Fetching from FakeStore...')
    const response = await fetch('https://fakestoreapi.com/products')
    const data = await response.json()
    
    for (const p of data) {
      if (!p.image) continue
      
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
    console.log(`Got ${products.length} products from FakeStore`)
  } catch (error) {
    console.error('FakeStore fetch error:', error)
  }
  
  return products
}

async function fetchEscuela(): Promise<ProductToSeed[]> {
  const products: ProductToSeed[] = []
  
  try {
    console.log('Fetching from Escuela...')
    const response = await fetch('https://api.escuelajs.co/api/v1/products?limit=50')
    const data = await response.json()
    
    for (const p of data) {
      const images = (p.images || []).filter((img: string) => {
        if (!img || typeof img !== 'string') return false
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
        description: p.description || `Premium ${p.title}`,
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
    console.log(`Got ${products.length} products from Escuela`)
  } catch (error) {
    console.error('Escuela fetch error:', error)
  }
  
  return products
}

async function main() {
  console.log('Starting product import...\n')
  
  // Fetch all products
  const dummyProducts = await fetchDummyJSON()
  const fakeStoreProducts = await fetchFakeStore()
  const escuelaProducts = await fetchEscuela()
  
  const allProducts = [...dummyProducts, ...fakeStoreProducts, ...escuelaProducts]
  console.log(`\nTotal products to import: ${allProducts.length}`)
  
  // Insert in batches
  let imported = 0
  const batchSize = 10
  
  for (let i = 0; i < allProducts.length; i += batchSize) {
    const batch = allProducts.slice(i, i + batchSize)
    
    const { data, error } = await supabase
      .from('products')
      .insert(batch)
      .select('id')
    
    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message)
    } else if (data) {
      imported += data.length
      process.stdout.write(`\rImported: ${imported}/${allProducts.length}`)
    }
  }
  
  console.log(`\n\n✅ Import complete! ${imported} products imported.`)
}

main().catch(console.error)
