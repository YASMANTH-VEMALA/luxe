'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Clock,
  AlertTriangle,
  Users,
  Eye,
  TrendingUp,
  RefreshCw,
  ArrowUpRight,
  Phone,
  Mail,
  ShoppingBag
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface DashboardStats {
  totalVisitors: number
  visitorsToday: number
  totalOrders: number
  ordersToday: number
  pendingOrders: number
  totalRevenue: number
  revenueToday: number
  totalProducts: number
  lowStockProducts: number
  outOfStockProducts: number
  recentOrders: any[]
  recentVisitors: any[]
}

interface LowStockProduct {
  id: string
  title: string
  slug: string
  stock_quantity: number
  low_stock_threshold: number
  images: string[]
}

interface DashboardClientProps {
  initialStats: DashboardStats
  lowStockProducts: LowStockProduct[]
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(price / 100)
}

export default function DashboardClient({ initialStats, lowStockProducts }: DashboardClientProps) {
  const [stats, setStats] = useState(initialStats)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const supabase = createClient()

  // Set up real-time subscriptions
  useEffect(() => {
    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        (payload) => {
          console.log('Order change:', payload)
          if (payload.eventType === 'INSERT') {
            setStats(prev => ({
              ...prev,
              totalOrders: prev.totalOrders + 1,
              ordersToday: prev.ordersToday + 1,
              pendingOrders: payload.new.status === 'pending' ? prev.pendingOrders + 1 : prev.pendingOrders,
              recentOrders: [payload.new, ...prev.recentOrders.slice(0, 4)]
            }))
          } else if (payload.eventType === 'UPDATE') {
            setStats(prev => ({
              ...prev,
              recentOrders: prev.recentOrders.map(o => 
                o.id === payload.new.id ? payload.new : o
              ),
              pendingOrders: payload.old.status === 'pending' && payload.new.status !== 'pending'
                ? prev.pendingOrders - 1
                : payload.old.status !== 'pending' && payload.new.status === 'pending'
                  ? prev.pendingOrders + 1
                  : prev.pendingOrders
            }))
          }
        }
      )
      .subscribe()

    // Subscribe to new visitors
    const visitorsChannel = supabase
      .channel('visitors-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitors' },
        (payload) => {
          console.log('New visitor:', payload)
          setStats(prev => ({
            ...prev,
            totalVisitors: prev.totalVisitors + 1,
            visitorsToday: prev.visitorsToday + 1,
            recentVisitors: [payload.new, ...prev.recentVisitors.slice(0, 9)]
          }))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(ordersChannel)
      supabase.removeChannel(visitorsChannel)
    }
  }, [supabase])

  const refreshStats = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (data) {
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
    setIsRefreshing(false)
  }

  const mainStats = [
    { 
      label: 'Total Visitors', 
      value: stats.totalVisitors, 
      today: stats.visitorsToday,
      icon: Users,
      href: '/admin/visitors',
      color: 'bg-blue-500'
    },
    { 
      label: 'Total Orders', 
      value: stats.totalOrders, 
      today: stats.ordersToday,
      icon: ShoppingCart,
      href: '/admin/orders',
      color: 'bg-green-500'
    },
    { 
      label: 'Pending Orders', 
      value: stats.pendingOrders, 
      icon: Clock,
      href: '/admin/orders?status=pending',
      color: 'bg-yellow-500',
      highlight: stats.pendingOrders > 0
    },
    { 
      label: 'Total Revenue', 
      value: formatPrice(stats.totalRevenue), 
      today: formatPrice(stats.revenueToday),
      icon: DollarSign,
      href: '/admin/orders',
      color: 'bg-purple-500'
    },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshStats}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {mainStats.map((stat) => (
          <Link 
            key={stat.label}
            href={stat.href}
            className={`bg-white p-4 rounded-xl border hover:shadow-md transition-shadow ${
              stat.highlight ? 'ring-2 ring-yellow-400' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
              {stat.today !== undefined && (
                <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +{typeof stat.today === 'string' ? stat.today : stat.today} today
                </div>
              )}
            </div>
            <div className="mt-3">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Product Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Link 
          href="/admin/products"
          className="bg-white p-4 rounded-xl border hover:shadow-md transition-shadow"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalProducts}</p>
              <p className="text-sm text-gray-500">Active Products</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/products?filter=low-stock"
          className={`bg-white p-4 rounded-xl border hover:shadow-md transition-shadow ${
            stats.lowStockProducts > 0 ? 'ring-2 ring-amber-400' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.lowStockProducts}</p>
              <p className="text-sm text-gray-500">Low Stock</p>
            </div>
          </div>
        </Link>
        
        <Link 
          href="/admin/products?filter=out-of-stock"
          className={`bg-white p-4 rounded-xl border hover:shadow-md transition-shadow ${
            stats.outOfStockProducts > 0 ? 'ring-2 ring-red-400' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.outOfStockProducts}</p>
              <p className="text-sm text-gray-500">Out of Stock</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts && lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h2 className="font-bold text-amber-800">Low Stock Products</h2>
          </div>
          <div className="space-y-2">
            {lowStockProducts.map((product) => (
              <Link
                key={product.id}
                href={`/admin/products?edit=${product.id}`}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-200 hover:bg-amber-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {product.images?.[0] && (
                    <img 
                      src={product.images[0]} 
                      alt={product.title}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  <span className="text-sm font-medium truncate max-w-[200px]">
                    {product.title}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  product.stock_quantity <= 3 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {product.stock_quantity} left
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-bold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              Recent Orders
            </h2>
            <Link href="/admin/orders" className="text-sm text-blue-600 hover:underline flex items-center">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="divide-y">
              {stats.recentOrders.map((order) => (
                <Link 
                  key={order.id}
                  href={`/admin/orders?view=${order.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{order.order_number}</p>
                    <p className="text-sm text-gray-500">{order.guest_name}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total_amount)}</p>
                    <Badge variant="outline" className={`text-xs ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700 border-green-200' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                      order.status === 'confirmed' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                      order.status === 'pending' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                      'bg-gray-100 text-gray-700 border-gray-200'
                    }`}>
                      {order.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-gray-500">No orders yet</p>
          )}
        </div>

        {/* Recent Visitors */}
        <div className="bg-white rounded-xl border">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Recent Visitors
            </h2>
            <Link href="/admin/visitors" className="text-sm text-blue-600 hover:underline flex items-center">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          {stats.recentVisitors && stats.recentVisitors.length > 0 ? (
            <div className="divide-y">
              {stats.recentVisitors.slice(0, 5).map((visitor) => (
                <Link 
                  key={visitor.id}
                  href={`/admin/visitors?view=${visitor.id}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      visitor.has_ordered ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      {visitor.has_ordered ? (
                        <ShoppingBag className="w-5 h-5 text-green-600" />
                      ) : (
                        <Eye className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {visitor.name || 'Anonymous Visitor'}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {visitor.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {visitor.phone}
                          </span>
                        )}
                        {visitor.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {visitor.email.substring(0, 15)}...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="w-3 h-3" />
                      {visitor.total_page_views || 0} pages
                    </div>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(new Date(visitor.last_visit_at), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="p-8 text-center text-gray-500">No visitors tracked yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
