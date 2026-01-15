// Type definitions for the application

export interface Product {
  id: string
  title: string
  slug: string
  description: string | null
  category: string
  price: number // in paise
  sale_price: number | null // in paise
  images: string[]
  sizes: string[] | null
  stock_quantity: number
  low_stock_threshold: number
  show_stock_count: boolean
  fake_viewers: number
  fake_sold_count: number
  is_active: boolean
  is_featured: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url: string | null
  display_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CartItem {
  productId: string
  title: string
  price: number // in paise
  sale_price: number | null
  image: string
  quantity: number
  size?: string
}

export interface ShippingAddress {
  fullName: string
  phone: string
  addressLine1: string
  addressLine2?: string
  city: string
  state: string
  pincode: string
}

export interface Order {
  id: string
  order_number: string
  user_id: string | null
  guest_name: string
  guest_phone: string
  guest_email: string | null
  shipping_address: ShippingAddress
  cart_items: CartItem[]
  subtotal: number
  cod_charges: number
  shipping_charges: number
  total_amount: number
  payment_method: 'cod' | 'razorpay'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  tracking_number: string | null
  tracking_url: string | null
  customer_notes: string | null
  admin_notes: string | null
  shipped_at: string | null
  delivered_at: string | null
  created_at: string
  updated_at: string
}

export interface Pincode {
  id: string
  pincode: string
  city: string | null
  state: string | null
  is_cod_available: boolean
  delivery_days: number
  shipping_charge: number
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface AdminUser {
  id: string
  user_id: string
  email: string
  role: 'admin' | 'super_admin'
  created_at: string
  updated_at: string
}
