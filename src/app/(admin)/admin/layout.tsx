import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SignOutButton } from '@/components/auth/SignOutButton'
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Tags,
  MapPin,
  Menu,
  X,
  Users,
  ShieldCheck,
  Download
} from 'lucide-react'

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/products', icon: Package, label: 'Products' },
  { href: '/admin/orders', icon: ShoppingCart, label: 'Orders' },
  { href: '/admin/visitors', icon: Users, label: 'Visitors' },
  { href: '/admin/categories', icon: Tags, label: 'Categories' },
  { href: '/admin/pincodes', icon: MapPin, label: 'Pincodes' },
  { href: '/admin/import', icon: Download, label: 'Import Products' },
  { href: '/admin/users', icon: ShieldCheck, label: 'Admin Users' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Server-side admin check - redirects if not admin
  await requireAdmin()
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header - Mobile */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/admin" className="font-bold text-lg">
            Luxe Admin
          </Link>
          <label htmlFor="sidebar-toggle" className="p-2 cursor-pointer">
            <Menu className="w-6 h-6" />
          </label>
        </div>
      </header>

      {/* Sidebar Toggle (CSS-only for mobile) */}
      <input type="checkbox" id="sidebar-toggle" className="hidden peer" />
      
      {/* Sidebar Overlay */}
      <label 
        htmlFor="sidebar-toggle" 
        className="fixed inset-0 bg-black/50 z-40 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto transition-opacity lg:hidden"
      />

      {/* Sidebar */}
      <aside className="fixed top-0 left-0 z-50 w-64 h-full bg-white border-r transform -translate-x-full peer-checked:translate-x-0 transition-transform lg:translate-x-0">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-4 border-b">
            <Link href="/admin" className="font-bold text-xl">
              Luxe Admin
            </Link>
            <label htmlFor="sidebar-toggle" className="p-2 cursor-pointer lg:hidden">
              <X className="w-5 h-5" />
            </label>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* User */}
          <div className="p-4 border-t">
            <p className="text-sm text-gray-500 mb-2 truncate">{user?.email}</p>
            <SignOutButton variant="outline" className="w-full" />
          </div>

          {/* Back to Store */}
          <div className="p-4 border-t">
            <Link 
              href="/"
              className="block text-center text-sm text-gray-500 hover:text-gray-700"
            >
              ← Back to Store
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  )
}
