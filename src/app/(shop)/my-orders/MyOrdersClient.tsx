'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  ChevronRight,
  Phone,
  ShoppingBag,
  MapPin,
  CreditCard,
  History
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getStoredOrders, OrderCookieData } from '@/lib/orderCookies'

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
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', icon: Package, color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
}

export default function MyOrdersClient() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [orders, setOrders] = useState<Order[]>([])
  const [storedOrders, setStoredOrders] = useState<OrderCookieData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingStored, setIsLoadingStored] = useState(true)
  const [error, setError] = useState('')
  const [searched, setSearched] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Load orders from cookies on mount
  useEffect(() => {
    const loadStoredOrders = async () => {
      const cookieOrders = getStoredOrders()
      setStoredOrders(cookieOrders)
      
      // If we have stored orders, fetch their full details from API
      if (cookieOrders.length > 0) {
        try {
          const orderIds = cookieOrders.map(o => o.orderId)
          
          const response = await fetch('/api/orders/by-ids', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderIds }),
          })

          if (response.ok) {
            const { orders: fetchedOrders } = await response.json()
            if (fetchedOrders && fetchedOrders.length > 0) {
              setOrders(fetchedOrders)
              setSearched(true)
            }
          }
        } catch (e) {
          console.error('Error fetching stored orders:', e)
        }
      }
      setIsLoadingStored(false)
    }
    
    loadStoredOrders()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const cleanPhone = phoneNumber.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      return
    }

    setIsLoading(true)
    setError('')
    setSearched(true)

    try {
      const response = await fetch('/api/orders/by-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone }),
      })

      if (response.ok) {
        const { orders: fetchedOrders } = await response.json()
        if (!fetchedOrders || fetchedOrders.length === 0) {
          setError('No orders found for this phone number.')
          setOrders([])
        } else {
          setOrders(fetchedOrders)
        }
      } else {
        setError('Something went wrong. Please try again.')
        setOrders([])
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setOrders([])
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

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  return (
    <div className="container max-w-2xl py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">My Orders</h1>
        <p className="text-muted-foreground">
          Track your orders using your phone number
        </p>
      </div>

      {/* Search Form - Always show */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                className="pl-9"
                maxLength={10}
              />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Searching...' : 'Find Orders'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Recent Orders from Cookies */}
      {!isLoadingStored && storedOrders.length > 0 && orders.length === 0 && !searched && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent orders on this device
          </p>
          <div className="space-y-2">
            {storedOrders.slice(0, 5).map((order) => (
              <Card 
                key={order.orderId}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => {
                  // Fetch full order details
                  fetch('/api/orders/by-ids', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderIds: [order.orderId] }),
                  })
                    .then(res => res.json())
                    .then(data => {
                      if (data.orders && data.orders.length > 0) {
                        setSelectedOrder(data.orders[0])
                        setIsDetailOpen(true)
                      }
                    })
                }}
              >
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-medium text-sm">{order.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {order.status}
                      </Badge>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Loading Stored Orders */}
      {isLoadingStored && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="py-4">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && searched && (
        <Card className="border-muted">
          <CardContent className="flex flex-col items-center py-8">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="font-medium mb-2">No Orders Found</p>
            <p className="text-sm text-muted-foreground text-center">
              {error}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Orders List */}
      {orders.length > 0 && !isLoading && !isLoadingStored && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              {orders.length} order{orders.length !== 1 ? 's' : ''} found
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                setOrders([])
                setSearched(false)
                setPhoneNumber('')
                setError('')
              }}
            >
              Clear
            </Button>
          </div>
          {orders.map((order) => {
            const config = statusConfig[order.status]
            const StatusIcon = config.icon
            const items = order.cart_items
            
            return (
              <Card 
                key={order.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => viewOrderDetails(order)}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-medium">{order.order_number}</span>
                        <Badge className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      
                      {/* Order Items Preview */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex -space-x-2">
                          {items.slice(0, 3).map((item, index) => (
                            <div 
                              key={index}
                              className="w-8 h-8 bg-muted rounded border-2 border-white overflow-hidden"
                            >
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.title}
                                  width={32}
                                  height={32}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  <Package className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="w-8 h-8 bg-muted rounded border-2 border-white flex items-center justify-center text-xs font-medium">
                              +{items.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">{formatPrice(order.total_amount)}</span>
                        <span>{format(new Date(order.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground mt-2" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Initial State */}
      {!searched && !isLoading && (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center py-12">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">View Your Orders</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Enter the phone number you used while placing orders to view your complete order history.
            </p>
            <Link href="/track-order">
              <Button variant="outline" size="sm">
                Or track a specific order
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <Badge className={statusConfig[selectedOrder.status].color}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Order Date */}
                <div className="text-sm text-muted-foreground">
                  Placed on {format(new Date(selectedOrder.created_at), 'MMMM d, yyyy \'at\' h:mm a')}
                </div>

                {/* Order Items */}
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4" />
                    Items
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.cart_items.map((item, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-14 h-14 bg-muted rounded overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.title}
                              width={56}
                              height={56}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {item.quantity}
                            {item.size && ` • Size: ${item.size}`}
                          </p>
                        </div>
                        <div className="text-sm font-medium">
                          {formatPrice((item.sale_price || item.price) * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.shipping_charges > 0 ? (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatPrice(selectedOrder.shipping_charges)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-green-600">
                        <span>Shipping</span>
                        <span>FREE</span>
                      </div>
                    )}
                    {selectedOrder.cod_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">COD Charges</span>
                        <span>{formatPrice(selectedOrder.cod_charges)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total_amount)}</span>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    Payment
                  </h4>
                  <div className="text-sm">
                    <p>{selectedOrder.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</p>
                    <p className={`text-xs ${
                      selectedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {selectedOrder.payment_status === 'paid' ? 'Paid' : 
                       selectedOrder.payment_method === 'cod' ? 'Pay on Delivery' : 'Pending'}
                    </p>
                  </div>
                </div>

                {/* Delivery Address */}
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Delivery Address
                  </h4>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{selectedOrder.shipping_address.fullName}</p>
                    <p>{selectedOrder.shipping_address.phone}</p>
                    <p>{selectedOrder.shipping_address.addressLine1}</p>
                    {selectedOrder.shipping_address.addressLine2 && (
                      <p>{selectedOrder.shipping_address.addressLine2}</p>
                    )}
                    <p>
                      {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pincode}
                    </p>
                  </div>
                </div>

                {/* Tracking Info */}
                {selectedOrder.tracking_number && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Tracking Number</p>
                    <p className="font-mono text-blue-700">{selectedOrder.tracking_number}</p>
                    {selectedOrder.tracking_url && (
                      <a 
                        href={selectedOrder.tracking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Track on courier website →
                      </a>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Link href={`/track-order?order=${selectedOrder.order_number}`} className="flex-1">
                    <Button variant="outline" className="w-full">
                      <Truck className="w-4 h-4 mr-2" />
                      Track Order
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    onClick={() => setIsDetailOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
