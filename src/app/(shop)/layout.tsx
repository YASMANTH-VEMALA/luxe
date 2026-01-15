import { BottomNavigation } from '@/components/layout/BottomNavigation'
import { Header } from '@/components/layout/Header'
import { CookieConsent } from '@/components/CookieConsent'
import { createClient } from '@/lib/supabase/server'
import { PageTransitionWrapper } from '@/components/layout/PageTransitionWrapper'
import { VisitorTracker } from '@/components/VisitorTracker'

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <PageTransitionWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header user={user ? { email: user.email || '' } : null} />
        <main className="pb-mobile-nav">
          {children}
        </main>
        <BottomNavigation />
        <CookieConsent />
        <VisitorTracker />
      </div>
    </PageTransitionWrapper>
  )
}
