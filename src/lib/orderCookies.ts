'use client'

// Order cookie management for storing user's order history locally
// This allows users to access their orders without needing an account

export interface OrderCookieData {
  orderId: string
  orderNumber: string
  total: number
  status: string
  createdAt: string
  phone: string
}

const COOKIE_NAME = 'luxe_orders'
const MAX_ORDERS = 20 // Store last 20 orders

// Get all stored orders from cookies
export function getStoredOrders(): OrderCookieData[] {
  if (typeof window === 'undefined') return []
  
  try {
    const cookie = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${COOKIE_NAME}=`))
    
    if (!cookie) return []
    
    const value = decodeURIComponent(cookie.split('=')[1])
    return JSON.parse(value) || []
  } catch (e) {
    console.error('Error reading order cookies:', e)
    return []
  }
}

// Add a new order to the cookie storage
export function storeOrder(order: OrderCookieData): void {
  if (typeof window === 'undefined') return
  
  try {
    const orders = getStoredOrders()
    
    // Check if order already exists
    const existingIndex = orders.findIndex(o => o.orderId === order.orderId)
    if (existingIndex >= 0) {
      // Update existing order
      orders[existingIndex] = order
    } else {
      // Add new order at the beginning
      orders.unshift(order)
    }
    
    // Keep only last MAX_ORDERS
    const trimmedOrders = orders.slice(0, MAX_ORDERS)
    
    // Store in cookie (expires in 1 year)
    const expires = new Date()
    expires.setFullYear(expires.getFullYear() + 1)
    
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(trimmedOrders))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
  } catch (e) {
    console.error('Error storing order cookie:', e)
  }
}

// Update an existing order's status
export function updateOrderStatus(orderId: string, status: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const orders = getStoredOrders()
    const orderIndex = orders.findIndex(o => o.orderId === orderId)
    
    if (orderIndex >= 0) {
      orders[orderIndex].status = status
      
      const expires = new Date()
      expires.setFullYear(expires.getFullYear() + 1)
      
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(orders))}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    }
  } catch (e) {
    console.error('Error updating order cookie:', e)
  }
}

// Check if user has any stored orders
export function hasStoredOrders(): boolean {
  return getStoredOrders().length > 0
}

// Get count of stored orders
export function getOrderCount(): number {
  return getStoredOrders().length
}

// Clear all stored orders
export function clearStoredOrders(): void {
  if (typeof window === 'undefined') return
  document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

// Get phone numbers from stored orders (for looking up orders)
export function getStoredPhoneNumbers(): string[] {
  const orders = getStoredOrders()
  const phones = [...new Set(orders.map(o => o.phone).filter(Boolean))]
  return phones
}
