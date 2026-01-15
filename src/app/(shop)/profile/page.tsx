import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { createClient } from '@/lib/supabase/server'
import { Package, ChevronRight, User, Clock, CheckCircle2, Truck, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SignOutButton } from '@/components/auth/SignOutButton'

export const metadata = {
  title: 'My Account | Luxe',
}

const statusConfig = {
  pending: { label: 'Pending', icon: Clock, color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', icon: CheckCircle2, color: 'bg-blue-100 text-blue-800' },
  processing: { label: 'Processing', icon: Package, color: 'bg-purple-100 text-purple-800' },
  shipped: { label: 'Shipped', icon: Truck, color: 'bg-indigo-100 text-indigo-800' },
  delivered: { label: 'Delivered', icon: CheckCircle2, color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', icon: XCircle, color: 'bg-red-100 text-red-800' },
}

export default async function ProfilePage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login?redirect=/profile')
  }

  // Fetch user's orders - query by user_id OR guest_email
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .or(`user_id.eq.${user.id},guest_email.eq.${user.email}`)
    .order('created_at', { ascending: false })
    .limit(10)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price / 100)
  }

  return (
    <div className="container max-w-2xl py-8 px-4">
      {/* User Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {user.user_metadata?.full_name || 'User'}
                </CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
            <SignOutButton />
          </div>
        </CardHeader>
      </Card>

      {/* Orders Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">My Orders</h2>
          <Link href="/track-order" className="text-sm text-primary hover:underline">
            Track an order
          </Link>
        </div>

        {!orders || orders.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No orders yet</h3>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                You haven&apos;t placed any orders yet. Start shopping to see your orders here!
              </p>
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const config = statusConfig[order.status as keyof typeof statusConfig]
              const StatusIcon = config.icon
              
              return (
                <Link 
                  key={order.id}
                  href={`/track-order?order=${order.order_number}`}
                >
                  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono font-medium">{order.order_number}</span>
                            <Badge className={config.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {config.label}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{order.cart_items?.length || 0} item{(order.cart_items?.length || 0) !== 1 ? 's' : ''}</span>
                            <span>{formatPrice(order.total_amount)}</span>
                            <span className="hidden sm:inline">
                              {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
