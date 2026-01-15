'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Package, Truck, CheckCircle2, Clock, XCircle, MapPin, Phone, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'

interface OrderItem {
  productId: string
  title: string
  price: number
  sale_price?: number | null
  quantity: number
  size?: string
  image?: string
}

interface Order {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  guest_name: string
  guest_phone: string
  guest_email?: string
  shipping_address: {
    fullName: string
    phone: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    pincode: string
  }
  cart_items: OrderItem[]
  total_amount: number
  subtotal: number
  shipping_charges: number
  cod_charges: number
  payment_method: 'cod' | 'razorpay'
  tracking_number?: string
  tracking_url?: string
  shipped_at?: string
  delivered_at?: string
  created_at: string
}

const statusConfig = {
  pending: { label: 'Order Placed', icon: Clock, color: 'bg-yellow-500', step: 1 },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-500', step: 2 },
  processing: { label: 'Processing', icon: Package, color: 'bg-purple-500', step: 3 },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-indigo-500', step: 4 },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-500', step: 5 },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-500', step: 0 },
}

const steps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const

export default function TrackOrderClient() {
  const searchParams = useSearchParams()
  const initialOrderNumber = searchParams.get('order') || ''
  
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber)
  const [order, setOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!orderNumber.trim()) {
      setError('Please enter an order number')
      return
    }

    setIsLoading(true)
    setError('')
    setSearched(true)

    try {
      const supabase = createClient()
      
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber.trim().toUpperCase())
        .single()

      if (fetchError || !data) {
        setError('Order not found. Please check the order number and try again.')
        setOrder(null)
      } else {
        setOrder(data)
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setOrder(null)
    } finally {
      setIsLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price / 100)
  }

  const getCurrentStep = () => {
    if (!order) return 0
    return statusConfig[order.status].step
  }

  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">Track Your Order</h1>
        <p className="text-muted-foreground">
          Enter your order number to see the current status
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
                placeholder="Enter order number (e.g., LX-XXXXXX)"
                className="pl-9 uppercase"
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Track'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center py-8">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="font-medium mb-2">Order Not Found</p>
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Order Details */}
      {order && !isLoading && (
        <div className="space-y-6">
          {/* Status Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Order {order.order_number}</CardTitle>
                  <CardDescription>
                    Placed {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                  </CardDescription>
                </div>
                <Badge className={`${statusConfig[order.status].color} text-white px-3 py-1`}>
                  {statusConfig[order.status].label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {/* Status Timeline */}
              {order.status !== 'cancelled' ? (
                <div className="relative">
                  <div className="flex justify-between mb-2">
                    {steps.map((step, index) => {
                      const config = statusConfig[step]
                      const Icon = config.icon
                      const isActive = getCurrentStep() >= config.step
                      const isCurrent = getCurrentStep() === config.step
                      
                      return (
                        <div key={step} className="flex flex-col items-center flex-1">
                          <div className={`
                            w-8 h-8 rounded-full flex items-center justify-center z-10
                            ${isActive 
                              ? isCurrent ? config.color : 'bg-green-500'
                              : 'bg-muted'
                            }
                            ${isActive ? 'text-white' : 'text-muted-foreground'}
                          `}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <span className={`
                            text-xs mt-2 text-center
                            ${isActive ? 'font-medium' : 'text-muted-foreground'}
                          `}>
                            {config.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {/* Progress Line */}
                  <div className="absolute top-4 left-0 right-0 h-0.5 bg-muted -z-0">
                    <div 
                      className="h-full bg-green-500 transition-all duration-500"
                      style={{ width: `${((getCurrentStep() - 1) / 4) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                  <p className="text-destructive font-medium">This order has been cancelled</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tracking Info */}
          {(order.tracking_number || order.tracking_url) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Tracking Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.tracking_number && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="font-mono font-medium">{order.tracking_number}</p>
                  </div>
                )}
                {order.tracking_url && (
                  <Button variant="outline" className="w-full" asChild>
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Track on Courier Website
                    </a>
                  </Button>
                )}
                {order.shipped_at && (
                  <p className="text-sm text-muted-foreground">
                    Shipped {formatDistanceToNow(new Date(order.shipped_at), { addSuffix: true })}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.cart_items.map((item, index) => (
                <div key={item.productId || index} className="flex gap-3">
                  {item.image && (
                    <div className="w-16 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.image} 
                        alt={item.title} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                      {item.size && ` • Size: ${item.size}`}
                    </p>
                  </div>
                  <div className="font-medium">
                    {formatPrice((item.sale_price ?? item.price) * item.quantity)}
                  </div>
                </div>
              ))}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {order.shipping_charges > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Shipping</span>
                    <span>{formatPrice(order.shipping_charges)}</span>
                  </div>
                )}
                {order.cod_charges > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>COD Charges</span>
                    <span>{formatPrice(order.cod_charges)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium">Total</span>
                  <span className="font-bold">{formatPrice(order.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Delivery Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{order.shipping_address.fullName || order.guest_name}</p>
              <p className="text-sm text-muted-foreground">{order.shipping_address.phone || order.guest_phone}</p>
              <div className="text-muted-foreground text-sm mt-1">
                <p>{order.shipping_address.addressLine1}</p>
                {order.shipping_address.addressLine2 && (
                  <p>{order.shipping_address.addressLine2}</p>
                )}
                <p>
                  {order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Need Help */}
          <Card className="bg-muted/50">
            <CardContent className="flex items-center justify-between py-4">
              <div>
                <p className="font-medium">Need help with your order?</p>
                <p className="text-sm text-muted-foreground">Contact our support team</p>
              </div>
              <Button variant="outline" asChild>
                <a href="tel:+919999999999">
                  <Phone className="h-4 w-4 mr-2" />
                  Call Us
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Initial State */}
      {!searched && !order && !isLoading && (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Enter your order number</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Your order number was sent to your email and phone after placing the order. 
              It starts with "LX-" followed by 6 characters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
