'use client'

import { useState, useTransition, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Filter,
  MoreHorizontal,
  Eye,
  RefreshCw,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  IndianRupee,
  CreditCard,
  Banknote,
  Bell
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { updateOrderStatus, updateOrderTracking } from '@/app/actions/admin'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface OrderItem {
  productId: string
  title: string
  price: number
  quantity: number
  size?: string
  image?: string
}

interface Order {
  id: string
  order_number: string
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  guest_name: string
  guest_email: string | null
  guest_phone: string
  shipping_address: {
    fullName?: string
    phone?: string
    addressLine1: string
    addressLine2?: string
    city: string
    state: string
    pincode: string
  }
  cart_items: OrderItem[]
  subtotal: number
  cod_charges: number
  shipping_charges: number
  total_amount: number
  payment_method: 'razorpay' | 'cod'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  razorpay_payment_id?: string
  tracking_number?: string
  tracking_url?: string
  shipped_at?: string
  delivered_at?: string
  created_at: string
}

interface OrdersClientProps {
  initialOrders: Order[]
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', icon: Package, color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
}

export default function OrdersClient({ initialOrders }: OrdersClientProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [newOrderAlert, setNewOrderAlert] = useState(false)

  // Real-time subscription for orders
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as Order
          setOrders(prev => [newOrder, ...prev])
          setNewOrderAlert(true)
          toast.success('New order received!', {
            description: `Order ${newOrder.order_number} from ${newOrder.guest_name}`,
            duration: 10000,
          })
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3')
            audio.play().catch(() => {})
          } catch {}
          // Clear alert after 5 seconds
          setTimeout(() => setNewOrderAlert(false), 5000)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updatedOrder = payload.new as Order
          setOrders(prev => 
            prev.map(o => o.id === updatedOrder.id ? updatedOrder : o)
          )
          // Update selected order if it's open
          if (selectedOrder?.id === updatedOrder.id) {
            setSelectedOrder(updatedOrder)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        (payload) => {
          const deletedOrder = payload.old as Order
          setOrders(prev => prev.filter(o => o.id !== deletedOrder.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedOrder?.id])

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.guest_email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      order.guest_phone.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price / 100)
  }

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('orderId', orderId)
      formData.append('status', newStatus)
      
      const result = await updateOrderStatus(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Order status updated')
        setOrders(prev => 
          prev.map(o => o.id === orderId 
            ? { 
                ...o, 
                status: newStatus as Order['status'],
                ...(newStatus === 'shipped' && { shipped_at: new Date().toISOString() }),
                ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
              } 
            : o
          )
        )
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? { 
            ...prev, 
            status: newStatus as Order['status'],
            ...(newStatus === 'shipped' && { shipped_at: new Date().toISOString() }),
            ...(newStatus === 'delivered' && { delivered_at: new Date().toISOString() }),
          } : null)
        }
      }
    })
  }

  const handleTrackingUpdate = (orderId: string, trackingNumber: string, trackingUrl: string) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append('orderId', orderId)
      formData.append('trackingNumber', trackingNumber)
      formData.append('trackingUrl', trackingUrl)
      
      const result = await updateOrderTracking(formData)
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Tracking info updated')
        setOrders(prev =>
          prev.map(o => o.id === orderId
            ? { ...o, tracking_number: trackingNumber, tracking_url: trackingUrl }
            : o
          )
        )
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev 
            ? { ...prev, tracking_number: trackingNumber, tracking_url: trackingUrl }
            : null
          )
        }
      }
    })
  }

  const viewOrderDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailOpen(true)
  }

  const getNextStatus = (currentStatus: string): string | null => {
    const flow: Record<string, string> = {
      pending: 'confirmed',
      confirmed: 'processing',
      processing: 'shipped',
      shipped: 'delivered',
    }
    return flow[currentStatus] || null
  }

  return (
    <div className="space-y-6">
      {/* New Order Alert */}
      {newOrderAlert && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3 animate-pulse">
          <Bell className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">New order received! Check the list below.</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Orders</h1>
            <Badge variant="secondary" className="font-normal">
              {orders.length} total
            </Badge>
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <Badge className="bg-yellow-100 text-yellow-800">
                {orders.filter(o => o.status === 'pending').length} pending
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Manage customer orders • Real-time updates enabled</p>
        </div>
        
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead className="hidden md:table-cell">Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">Payment</TableHead>
              <TableHead>Total</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'No orders found' 
                    : 'No orders yet'}
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => {
                const StatusIcon = statusConfig[order.status].icon
                return (
                  <TableRow key={order.id} className="cursor-pointer" onClick={() => viewOrderDetails(order)}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{order.order_number}</span>
                        <span className="text-sm text-muted-foreground md:hidden">
                          {order.guest_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.guest_name}</span>
                        <span className="text-sm text-muted-foreground">
                          {order.cart_items.length} item{order.cart_items.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[order.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[order.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {order.payment_method === 'cod' ? (
                          <Badge variant="outline">
                            <Banknote className="h-3 w-3 mr-1" />
                            COD
                          </Badge>
                        ) : (
                          <Badge variant="outline" className={
                            order.payment_status === 'paid' 
                              ? 'text-green-700 border-green-200 bg-green-50' 
                              : order.payment_status === 'failed'
                              ? 'text-red-700 border-red-200 bg-red-50'
                              : order.payment_status === 'refunded'
                              ? 'text-purple-700 border-purple-200 bg-purple-50'
                              : 'text-yellow-700 border-yellow-200 bg-yellow-50'
                          }>
                            <CreditCard className="h-3 w-3 mr-1" />
                            {order.payment_status === 'paid' ? 'Paid' : 
                             order.payment_status === 'failed' ? 'Failed' :
                             order.payment_status === 'refunded' ? 'Refunded' : 'Pending'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatPrice(order.total_amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => viewOrderDetails(order)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {getNextStatus(order.status) && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(order.id, getNextStatus(order.status)!)}
                              disabled={isPending}
                            >
                              <ChevronDown className="h-4 w-4 mr-2" />
                              Mark as {statusConfig[getNextStatus(order.status) as keyof typeof statusConfig].label}
                            </DropdownMenuItem>
                          )}
                          {order.status !== 'cancelled' && order.status !== 'delivered' && (
                            <DropdownMenuItem 
                              onClick={() => handleStatusUpdate(order.id, 'cancelled')}
                              className="text-destructive"
                              disabled={isPending}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>Order {selectedOrder.order_number}</span>
                  <Badge className={statusConfig[selectedOrder.status].color}>
                    {statusConfig[selectedOrder.status].label}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  Placed {formatDistanceToNow(new Date(selectedOrder.created_at), { addSuffix: true })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Status Update */}
                <div className="p-4 border rounded-lg bg-muted/50">
                  <Label className="text-sm font-medium">Update Status</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(['pending', 'confirmed', 'processing', 'shipped', 'delivered'] as const).map((status) => {
                      const config = statusConfig[status]
                      const Icon = config.icon
                      return (
                        <Button
                          key={status}
                          variant={selectedOrder.status === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleStatusUpdate(selectedOrder.id, status)}
                          disabled={isPending || selectedOrder.status === status}
                        >
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Button>
                      )
                    })}
                  </div>
                </div>

                {/* Customer Info */}
                <div>
                  <h4 className="font-medium mb-3">Customer Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{selectedOrder.guest_name}</span>
                    </div>
                    {selectedOrder.guest_email && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${selectedOrder.guest_email}`} className="hover:underline">
                          {selectedOrder.guest_email}
                        </a>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <a href={`tel:${selectedOrder.guest_phone}`} className="hover:underline">
                        {selectedOrder.guest_phone}
                      </a>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div>
                  <h4 className="font-medium mb-3">Shipping Address</h4>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5" />
                    <div>
                      <p>{selectedOrder.shipping_address.addressLine1}</p>
                      {selectedOrder.shipping_address.addressLine2 && (
                        <p>{selectedOrder.shipping_address.addressLine2}</p>
                      )}
                      <p>
                        {selectedOrder.shipping_address.city}, {selectedOrder.shipping_address.state} - {selectedOrder.shipping_address.pincode}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Order Items</h4>
                  <div className="space-y-3">
                    {selectedOrder.cart_items.map((item, index) => (
                      <div key={item.productId || index} className="flex gap-3 p-3 border rounded-lg">
                        {item.image && (
                          <div className="w-16 h-16 bg-muted rounded-md overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Qty: {item.quantity} {item.size && `• Size: ${item.size}`}
                          </p>
                        </div>
                        <div className="font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Summary */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Payment Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                    {selectedOrder.shipping_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>{formatPrice(selectedOrder.shipping_charges)}</span>
                      </div>
                    )}
                    {selectedOrder.cod_charges > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">COD Charges</span>
                        <span>{formatPrice(selectedOrder.cod_charges)}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t font-medium text-base">
                      <span>Total</span>
                      <span>{formatPrice(selectedOrder.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      {selectedOrder.payment_method === 'cod' ? (
                        <Badge variant="outline">
                          <Banknote className="h-3 w-3 mr-1" />
                          Cash on Delivery
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <CreditCard className="h-3 w-3 mr-1" />
                          Razorpay
                          {selectedOrder.razorpay_payment_id && (
                            <span className="ml-1 text-xs">({selectedOrder.razorpay_payment_id})</span>
                          )}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tracking Info (for shipped/delivered orders) */}
                {(selectedOrder.status === 'shipped' || selectedOrder.status === 'delivered') && (
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Tracking Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="trackingNumber" className="text-xs">Tracking Number</Label>
                        <Input
                          id="trackingNumber"
                          defaultValue={selectedOrder.tracking_number || ''}
                          placeholder="Enter tracking number"
                          onBlur={(e) => {
                            if (e.target.value !== selectedOrder.tracking_number) {
                              handleTrackingUpdate(
                                selectedOrder.id, 
                                e.target.value, 
                                selectedOrder.tracking_url || ''
                              )
                            }
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="trackingUrl" className="text-xs">Tracking URL</Label>
                        <Input
                          id="trackingUrl"
                          defaultValue={selectedOrder.tracking_url || ''}
                          placeholder="https://..."
                          onBlur={(e) => {
                            if (e.target.value !== selectedOrder.tracking_url) {
                              handleTrackingUpdate(
                                selectedOrder.id,
                                selectedOrder.tracking_number || '',
                                e.target.value
                              )
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
