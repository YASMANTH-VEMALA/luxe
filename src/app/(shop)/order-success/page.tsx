import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { formatPrice } from '@/lib/utils'
import { CheckCircle, Package, ArrowRight, ShoppingBag, MapPin, CreditCard, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { StoreOrderCookie } from '@/components/StoreOrderCookie'

interface OrderSuccessPageProps {
  searchParams: Promise<{ orderId?: string }>
}

export default async function OrderSuccessPage({ searchParams }: OrderSuccessPageProps) {
  const params = await searchParams
  
  if (!params.orderId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invalid order</p>
      </div>
    )
  }

  // Use admin client to bypass RLS for fetching order
  const supabase = createAdminClient()
  
  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', params.orderId)
    .single()

  if (!order || error) {
    console.error('Order fetch error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-gray-600">Order not found</p>
        <Link href="/products">
          <Button>Continue Shopping</Button>
        </Link>
      </div>
    )
  }

  const items = order.cart_items as Array<{
    productId: string
    title: string
    price: number
    sale_price?: number | null
    image: string
    quantity: number
    size?: string
  }>

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Store order to cookies for easy access */}
      <StoreOrderCookie 
        order={{
          orderId: order.id,
          orderNumber: order.order_number,
          total: order.total_amount,
          status: order.status,
          createdAt: order.created_at,
          phone: order.guest_phone || order.shipping_address?.phone || '',
        }} 
      />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-gray-600">
            Thank you for your order. We&apos;ll send you updates on WhatsApp.
          </p>
        </div>

        {/* Order Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          {/* Order Header */}
          <div className="bg-gray-900 text-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Order Number</p>
                <p className="font-mono font-bold text-lg">{order.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Status</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-sm font-medium capitalize">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  {order.status}
                </span>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="p-4 border-b">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Order Items ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <Image
                        src={item.image}
                        alt={item.title}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Package className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                      {item.size && ` • Size: ${item.size}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatPrice((item.sale_price || item.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="p-4 border-b bg-gray-50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.shipping_charges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping</span>
                  <span>{formatPrice(order.shipping_charges)}</span>
                </div>
              )}
              {order.shipping_charges === 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Shipping</span>
                  <span>FREE</span>
                </div>
              )}
              {order.cod_charges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">COD Charges</span>
                  <span>{formatPrice(order.cod_charges)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatPrice(order.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="p-4 border-b">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Payment
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                {order.payment_method === 'cod' ? 'Cash on Delivery' : 'Online Payment'}
              </span>
              <span className={`text-sm font-medium ${
                order.payment_status === 'paid' ? 'text-green-600' : 'text-yellow-600'
              }`}>
                {order.payment_status === 'paid' ? 'Paid' : 
                 order.payment_method === 'cod' ? 'Pay on Delivery' : 'Pending'}
              </span>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="p-4">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Delivery Address
            </h3>
            <div className="text-sm text-gray-600">
              <p className="font-medium text-gray-900">{order.shipping_address.fullName}</p>
              <p>{order.shipping_address.phone}</p>
              <p>{order.shipping_address.addressLine1}</p>
              {order.shipping_address.addressLine2 && <p>{order.shipping_address.addressLine2}</p>}
              <p>{order.shipping_address.city}, {order.shipping_address.state} - {order.shipping_address.pincode}</p>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <Truck className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">Estimated Delivery</p>
              <p className="text-sm text-blue-700">3-5 business days</p>
              <p className="text-xs text-blue-600 mt-1">
                You&apos;ll receive tracking updates via WhatsApp
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href={`/track-order?order=${order.order_number}`} className="block">
            <Button variant="outline" className="w-full h-12">
              <Package className="w-4 h-4 mr-2" />
              Track Order
            </Button>
          </Link>
          <Link href="/products" className="block">
            <Button className="w-full h-12 bg-gray-900 hover:bg-gray-800">
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {/* Support */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Questions about your order? <br />
          <a href="https://wa.me/919999999999" className="text-green-600 hover:underline">
            Contact us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  )
}
