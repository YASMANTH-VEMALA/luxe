'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import { revalidatePath } from 'next/cache'

// ============================================
// VISITOR ACTIONS
// ============================================

export async function trackVisitor(data: {
  sessionId: string
  name?: string
  email?: string
  phone?: string
  pageUrl?: string
  pageTitle?: string
  productId?: string
  productTitle?: string
  eventType?: string
  userAgent?: string
  referrer?: string
}) {
  const supabase = await createClient()
  
  try {
    // Check if visitor exists with this session
    const { data: existingVisitor } = await supabase
      .from('visitors')
      .select('id, visit_count, pages_viewed, products_viewed')
      .eq('session_id', data.sessionId)
      .single()

    if (existingVisitor) {
      // Update existing visitor
      const pagesViewed = existingVisitor.pages_viewed || []
      const productsViewed = existingVisitor.products_viewed || []

      // Add page view if not already tracked
      if (data.pageUrl && !pagesViewed.some((p: { url: string }) => p.url === data.pageUrl)) {
        pagesViewed.push({
          url: data.pageUrl,
          title: data.pageTitle,
          viewedAt: new Date().toISOString()
        })
      }

      // Add product view
      if (data.productId && !productsViewed.some((p: { id: string }) => p.id === data.productId)) {
        productsViewed.push({
          id: data.productId,
          title: data.productTitle,
          viewedAt: new Date().toISOString()
        })
      }

      const { error } = await supabase
        .from('visitors')
        .update({
          name: data.name || undefined,
          email: data.email || undefined,
          phone: data.phone || undefined,
          last_visit_at: new Date().toISOString(),
          visit_count: existingVisitor.visit_count + 1,
          pages_viewed: pagesViewed,
          products_viewed: productsViewed,
          total_page_views: pagesViewed.length,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingVisitor.id)

      if (error) {
        console.error('Error updating visitor:', error)
      }

      // Track event if specified
      if (data.eventType) {
        await supabase.from('analytics_events').insert({
          visitor_id: existingVisitor.id,
          session_id: data.sessionId,
          event_type: data.eventType,
          page_url: data.pageUrl,
          page_title: data.pageTitle,
          product_id: data.productId,
          product_title: data.productTitle,
          event_data: {
            timestamp: new Date().toISOString()
          }
        })
      }

      return { success: true, visitorId: existingVisitor.id }
    } else {
      // Create new visitor
      // Parse user agent for device info
      const deviceType = data.userAgent?.includes('Mobile') ? 'mobile' 
        : data.userAgent?.includes('Tablet') ? 'tablet' 
        : 'desktop'

      const { data: newVisitor, error } = await supabase
        .from('visitors')
        .insert({
          session_id: data.sessionId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          user_agent: data.userAgent,
          device_type: deviceType,
          referrer: data.referrer,
          pages_viewed: data.pageUrl ? [{
            url: data.pageUrl,
            title: data.pageTitle,
            viewedAt: new Date().toISOString()
          }] : [],
          products_viewed: data.productId ? [{
            id: data.productId,
            title: data.productTitle,
            viewedAt: new Date().toISOString()
          }] : [],
          total_page_views: data.pageUrl ? 1 : 0
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating visitor:', error)
        return { error: 'Failed to track visitor' }
      }

      // Track initial event
      if (data.eventType && newVisitor) {
        await supabase.from('analytics_events').insert({
          visitor_id: newVisitor.id,
          session_id: data.sessionId,
          event_type: data.eventType,
          page_url: data.pageUrl,
          page_title: data.pageTitle,
          product_id: data.productId,
          product_title: data.productTitle,
        })
      }

      return { success: true, visitorId: newVisitor?.id }
    }
  } catch (error) {
    console.error('Visitor tracking error:', error)
    return { error: 'Something went wrong' }
  }
}

export async function updateVisitorContact(data: {
  sessionId: string
  name?: string
  email?: string
  phone?: string
}) {
  const supabase = await createClient()
  
  try {
    const { error } = await supabase
      .from('visitors')
      .update({
        name: data.name,
        email: data.email,
        phone: data.phone,
        updated_at: new Date().toISOString()
      })
      .eq('session_id', data.sessionId)

    if (error) {
      console.error('Error updating visitor contact:', error)
      return { error: 'Failed to update contact' }
    }

    return { success: true }
  } catch (error) {
    console.error('Update visitor error:', error)
    return { error: 'Something went wrong' }
  }
}

// ============================================
// ADMIN VISITOR ACTIONS
// ============================================

export async function getVisitors(options?: {
  page?: number
  limit?: number
  hasOrdered?: boolean
  search?: string
}) {
  await requireAdmin()
  
  const supabase = await createClient()
  const page = options?.page || 1
  const limit = options?.limit || 50
  const offset = (page - 1) * limit

  let query = supabase
    .from('visitors')
    .select('*', { count: 'exact' })
    .order('last_visit_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (options?.hasOrdered !== undefined) {
    query = query.eq('has_ordered', options.hasOrdered)
  }

  if (options?.search) {
    query = query.or(`name.ilike.%${options.search}%,email.ilike.%${options.search}%,phone.ilike.%${options.search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return { error: 'Failed to fetch visitors', data: [], count: 0 }
  }

  return { data: data || [], count: count || 0 }
}

export async function getVisitorDetails(visitorId: string) {
  await requireAdmin()
  
  const supabase = await createClient()

  const { data: visitor, error } = await supabase
    .from('visitors')
    .select('*')
    .eq('id', visitorId)
    .single()

  if (error) {
    return { error: 'Visitor not found' }
  }

  // Get visitor's orders if they have any
  let orders = []
  if (visitor.phone || visitor.email) {
    const { data: orderData } = await supabase
      .from('orders')
      .select('*')
      .or(`guest_phone.eq.${visitor.phone},guest_email.eq.${visitor.email}`)
      .order('created_at', { ascending: false })
    
    orders = orderData || []
  }

  // Get visitor's events
  const { data: events } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { 
    data: { 
      ...visitor, 
      orders,
      events: events || []
    } 
  }
}

export async function blockVisitor(visitorId: string) {
  await requireAdmin()
  
  const supabase = await createClient()

  const { error } = await supabase
    .from('visitors')
    .update({ is_blocked: true })
    .eq('id', visitorId)

  if (error) {
    return { error: 'Failed to block visitor' }
  }

  revalidatePath('/admin/visitors')
  return { success: true }
}

export async function deleteVisitor(visitorId: string) {
  await requireAdmin()
  
  const supabase = await createClient()

  const { error } = await supabase
    .from('visitors')
    .delete()
    .eq('id', visitorId)

  if (error) {
    return { error: 'Failed to delete visitor' }
  }

  revalidatePath('/admin/visitors')
  return { success: true }
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats() {
  await requireAdmin()
  
  const supabase = await createClient()
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  const [
    { count: totalVisitors },
    { count: visitorsToday },
    { count: totalOrders },
    { count: ordersToday },
    { count: pendingOrders },
    { data: revenueData },
    { data: revenueTodayData },
    { count: totalProducts },
    { count: lowStockProducts },
    { count: outOfStockProducts },
    { data: recentOrders },
    { data: recentVisitors },
  ] = await Promise.all([
    supabase.from('visitors').select('*', { count: 'exact', head: true }),
    supabase.from('visitors').select('*', { count: 'exact', head: true }).gte('last_visit_at', todayISO),
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid'),
    supabase.from('orders').select('total_amount').eq('payment_status', 'paid').gte('created_at', todayISO),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).gt('stock_quantity', 0).lte('stock_quantity', 10),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).lte('stock_quantity', 0),
    supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('visitors').select('*').order('last_visit_at', { ascending: false }).limit(10),
  ])

  const totalRevenue = revenueData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
  const revenueToday = revenueTodayData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0

  return {
    totalVisitors: totalVisitors || 0,
    visitorsToday: visitorsToday || 0,
    totalOrders: totalOrders || 0,
    ordersToday: ordersToday || 0,
    pendingOrders: pendingOrders || 0,
    totalRevenue,
    revenueToday,
    totalProducts: totalProducts || 0,
    lowStockProducts: lowStockProducts || 0,
    outOfStockProducts: outOfStockProducts || 0,
    recentOrders: recentOrders || [],
    recentVisitors: recentVisitors || [],
  }
}
