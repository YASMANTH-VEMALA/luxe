import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import VisitorsClient from './VisitorsClient'

export const metadata = {
  title: 'Visitors & Analytics - Admin | Luxe',
}

export default async function AdminVisitorsPage() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  // Fetch visitors with their page views count
  const { data: visitors } = await supabase
    .from('visitors')
    .select('*')
    .order('last_visit_at', { ascending: false })
    .limit(200)

  // Fetch recent analytics events
  const { data: events } = await supabase
    .from('analytics_events')
    .select('*, visitors(name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  // Get analytics stats
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count: todayVisitors } = await supabase
    .from('visitors')
    .select('*', { count: 'exact', head: true })
    .gte('first_visit_at', today.toISOString())

  const { count: todayEvents } = await supabase
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  const { count: totalVisitors } = await supabase
    .from('visitors')
    .select('*', { count: 'exact', head: true })

  const { count: visitorsWithContact } = await supabase
    .from('visitors')
    .select('*', { count: 'exact', head: true })
    .or('name.neq.,email.neq.,phone.neq.')

  const initialStats = {
    todayVisitors: todayVisitors || 0,
    todayPageViews: todayEvents || 0,
    totalVisitors: totalVisitors || 0,
    visitorsWithContact: visitorsWithContact || 0,
  }

  // Transform events to match pageViews format
  const pageViews = (events || []).map(event => ({
    id: event.id,
    visitor_id: event.visitor_id,
    page_path: event.page_url || '',
    page_title: event.page_title,
    referrer: null,
    viewed_at: event.created_at,
    site_visitors: event.visitors
  }))

  return (
    <VisitorsClient 
      initialVisitors={visitors || []} 
      initialPageViews={pageViews}
      initialStats={initialStats}
    />
  )
}
