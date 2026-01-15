'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { 
  Search, 
  Users, 
  Eye, 
  Clock, 
  Mail, 
  Phone, 
  UserCheck, 
  Globe,
  MousePointer,
  TrendingUp,
  Activity,
  RefreshCw,
  ExternalLink,
  User,
  ShoppingBag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Visitor {
  id: string
  session_id: string
  name: string | null
  email: string | null
  phone: string | null
  first_visit_at: string
  last_visit_at: string
  total_page_views: number
  has_ordered: boolean
  user_agent?: string
  ip_address?: string
  device_type?: string
  visit_count: number
  products_viewed?: Array<{ id: string; title: string; viewedAt: string }>
}

interface PageView {
  id: string
  visitor_id: string
  page_path: string
  page_title: string | null
  referrer: string | null
  viewed_at: string
  site_visitors?: {
    name: string | null
    email: string | null
  }
}

interface VisitorsClientProps {
  initialVisitors: Visitor[]
  initialPageViews: PageView[]
  initialStats: {
    todayVisitors: number
    todayPageViews: number
    totalVisitors: number
    visitorsWithContact: number
  }
}

export default function VisitorsClient({ 
  initialVisitors, 
  initialPageViews,
  initialStats 
}: VisitorsClientProps) {
  const [visitors, setVisitors] = useState(initialVisitors)
  const [pageViews, setPageViews] = useState(initialPageViews)
  const [stats, setStats] = useState(initialStats)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisitor, setSelectedVisitor] = useState<Visitor | null>(null)
  const [visitorPageViews, setVisitorPageViews] = useState<PageView[]>([])
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('visitors')
  const [liveVisitorCount, setLiveVisitorCount] = useState(0)

  // Real-time subscription
  useEffect(() => {
    const supabase = createClient()
    
    // Subscribe to new visitors
    const visitorsChannel = supabase
      .channel('visitors-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'visitors' },
        (payload) => {
          const newVisitor = payload.new as Visitor
          setVisitors(prev => [newVisitor, ...prev])
          setStats(prev => ({
            ...prev,
            todayVisitors: prev.todayVisitors + 1,
            totalVisitors: prev.totalVisitors + 1
          }))
          toast.info('New visitor!', {
            description: newVisitor.name || 'Anonymous visitor joined',
          })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'visitors' },
        (payload) => {
          const updatedVisitor = payload.new as Visitor
          setVisitors(prev => 
            prev.map(v => v.id === updatedVisitor.id ? updatedVisitor : v)
          )
          if (updatedVisitor.name || updatedVisitor.email) {
            setStats(prev => ({
              ...prev,
              visitorsWithContact: prev.visitorsWithContact + 1
            }))
          }
        }
      )
      .subscribe()

    // Subscribe to analytics events
    const eventsChannel = supabase
      .channel('events-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        async (payload) => {
          const newEvent = payload.new as { id: string; visitor_id: string; page_url: string; page_title: string; created_at: string }
          // Fetch visitor info for this event
          const { data: visitor } = await supabase
            .from('visitors')
            .select('name, email')
            .eq('id', newEvent.visitor_id)
            .single()
          
          const pageViewFromEvent = {
            id: newEvent.id,
            visitor_id: newEvent.visitor_id,
            page_path: newEvent.page_url || '',
            page_title: newEvent.page_title,
            referrer: null,
            viewed_at: newEvent.created_at,
            site_visitors: visitor
          }
          
          setPageViews(prev => [pageViewFromEvent, ...prev.slice(0, 99)])
          setStats(prev => ({
            ...prev,
            todayPageViews: prev.todayPageViews + 1
          }))
        }
      )
      .subscribe()

    // Calculate live visitors (active in last 5 minutes)
    const calculateLiveVisitors = () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      const live = visitors.filter(v => new Date(v.last_visit_at) > fiveMinutesAgo).length
      setLiveVisitorCount(live)
    }
    calculateLiveVisitors()
    const liveInterval = setInterval(calculateLiveVisitors, 30000)

    return () => {
      supabase.removeChannel(visitorsChannel)
      supabase.removeChannel(eventsChannel)
      clearInterval(liveInterval)
    }
  }, [visitors])

  // Filter visitors
  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = 
      visitor.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (visitor.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (visitor.email?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (visitor.phone || '').includes(searchQuery)
    
    return matchesSearch
  })

  // View visitor details
  const viewVisitorDetails = async (visitor: Visitor) => {
    setSelectedVisitor(visitor)
    setIsDetailOpen(true)
    
    // Fetch analytics events for this visitor
    const supabase = createClient()
    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .eq('visitor_id', visitor.id)
      .order('created_at', { ascending: false })
      .limit(50)
    
    // Transform events to page views format
    const pageViews = (data || []).map(event => ({
      id: event.id,
      visitor_id: event.visitor_id,
      page_path: event.page_url || '',
      page_title: event.page_title,
      referrer: null,
      viewed_at: event.created_at
    }))
    
    setVisitorPageViews(pageViews)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Visitors & Analytics</h1>
            {liveVisitorCount > 0 && (
              <Badge className="bg-green-100 text-green-800 animate-pulse">
                <Activity className="h-3 w-3 mr-1" />
                {liveVisitorCount} online now
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">Track visitor activity and engagement</p>
        </div>
        
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Today&apos;s Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayVisitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Today&apos;s Page Views
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todayPageViews}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Total Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisitors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Identified Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.visitorsWithContact}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalVisitors > 0 
                ? `${Math.round((stats.visitorsWithContact / stats.totalVisitors) * 100)}%`
                : '0%'
              } identified
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="visitors" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Visitors
          </TabsTrigger>
          <TabsTrigger value="pageviews" className="flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Live Activity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitors" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search visitors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Visitors Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead className="hidden md:table-cell">Contact</TableHead>
                  <TableHead>Page Views</TableHead>
                  <TableHead className="hidden sm:table-cell">First Visit</TableHead>
                  <TableHead>Last Active</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVisitors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No visitors found' : 'No visitors yet'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVisitors.map((visitor) => {
                    const isOnline = new Date(visitor.last_visit_at) > new Date(Date.now() - 5 * 60 * 1000)
                    return (
                      <TableRow 
                        key={visitor.id} 
                        className="cursor-pointer" 
                        onClick={() => viewVisitorDetails(visitor)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {visitor.name || 'Anonymous'}
                              </span>
                              <span className="text-xs text-muted-foreground font-mono">
                                {visitor.session_id.slice(0, 8)}...
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            {visitor.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="h-3 w-3" />
                                {visitor.email}
                              </span>
                            )}
                            {visitor.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {visitor.phone}
                              </span>
                            )}
                            {!visitor.email && !visitor.phone && (
                              <span className="text-muted-foreground/50">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {visitor.total_page_views} pages
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                          {format(new Date(visitor.first_visit_at), 'MMM d, h:mm a')}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDistanceToNow(new Date(visitor.last_visit_at), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex gap-2">
                            {isOnline && (
                              <Badge className="bg-green-100 text-green-800">Online</Badge>
                            )}
                            {visitor.has_ordered && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <ShoppingBag className="h-3 w-3 mr-1" />
                                Customer
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="pageviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Page Views
              </CardTitle>
              <CardDescription>
                Real-time activity feed of all page views
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {pageViews.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No page views yet
                  </p>
                ) : (
                  pageViews.map((view) => (
                    <div 
                      key={view.id} 
                      className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <MousePointer className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {view.site_visitors?.name || 'Anonymous'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            viewed
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {view.page_path}
                        </p>
                        {view.referrer && (
                          <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                            <ExternalLink className="h-3 w-3" />
                            from: {view.referrer}
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(view.viewed_at), { addSuffix: true })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Visitor Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedVisitor && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedVisitor.name || 'Anonymous Visitor'}
                </DialogTitle>
                <DialogDescription>
                  Session: {selectedVisitor.session_id}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Contact Info */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Contact Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name</span>
                      <p className="font-medium">{selectedVisitor.name || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium">{selectedVisitor.email || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone</span>
                      <p className="font-medium">{selectedVisitor.phone || 'Not provided'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status</span>
                      <p>
                        {selectedVisitor.has_ordered ? (
                          <Badge className="bg-blue-100 text-blue-800">Customer</Badge>
                        ) : (
                          <Badge variant="secondary">Visitor</Badge>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-3">Activity Stats</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Page Views</span>
                      <p className="text-xl font-bold">{selectedVisitor.total_page_views}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">First Visit</span>
                      <p className="font-medium">
                        {format(new Date(selectedVisitor.first_visit_at), 'MMM d, yyyy h:mm a')}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last Active</span>
                      <p className="font-medium">
                        {formatDistanceToNow(new Date(selectedVisitor.last_visit_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Page View History */}
                <div>
                  <h4 className="font-medium mb-3">Page View History</h4>
                  <div className="border rounded-lg max-h-[300px] overflow-y-auto">
                    {visitorPageViews.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground">Loading...</p>
                    ) : (
                      <div className="divide-y">
                        {visitorPageViews.map((view) => (
                          <div key={view.id} className="p-3 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{view.page_path}</p>
                              {view.page_title && (
                                <p className="text-xs text-muted-foreground">{view.page_title}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(view.viewed_at), 'MMM d, h:mm a')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
