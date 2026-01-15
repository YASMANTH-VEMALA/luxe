-- ============================================
-- VISITORS & USER TRACKING TABLE
-- Track all visitors who interact with the website
-- ============================================

-- Visitors table to track everyone who visits the site
CREATE TABLE IF NOT EXISTS public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User identification
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- Contact info (when provided)
  name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Device & Browser info
  user_agent TEXT,
  device_type TEXT, -- 'mobile', 'tablet', 'desktop'
  browser TEXT,
  os TEXT,
  
  -- Location info
  ip_address TEXT,
  country TEXT,
  city TEXT,
  
  -- Visit tracking
  first_visit_at TIMESTAMPTZ DEFAULT NOW(),
  last_visit_at TIMESTAMPTZ DEFAULT NOW(),
  visit_count INTEGER DEFAULT 1,
  
  -- Page views
  pages_viewed JSONB DEFAULT '[]'::JSONB,
  total_page_views INTEGER DEFAULT 1,
  
  -- E-commerce activity
  products_viewed JSONB DEFAULT '[]'::JSONB,
  cart_items JSONB DEFAULT '[]'::JSONB,
  wishlist_items JSONB DEFAULT '[]'::JSONB,
  
  -- Conversion tracking
  has_ordered BOOLEAN DEFAULT false,
  total_orders INTEGER DEFAULT 0,
  total_spent INTEGER DEFAULT 0, -- in paise
  
  -- Source tracking
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  
  -- Status
  is_subscribed BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_visitors_session ON public.visitors(session_id);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON public.visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitors_phone ON public.visitors(phone);
CREATE INDEX IF NOT EXISTS idx_visitors_user_id ON public.visitors(user_id);
CREATE INDEX IF NOT EXISTS idx_visitors_last_visit ON public.visitors(last_visit_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitors_has_ordered ON public.visitors(has_ordered);

-- Enable RLS
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

-- Anyone can insert visitor records (for tracking)
CREATE POLICY "Anyone can create visitor records"
ON public.visitors
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Anyone can update their own visitor record
CREATE POLICY "Anyone can update own visitor record"
ON public.visitors
FOR UPDATE
TO anon, authenticated
USING (session_id IS NOT NULL)
WITH CHECK (true);

-- Admins can view all visitors
CREATE POLICY "Admins can view all visitors"
ON public.visitors
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);

-- Admins can update visitors
CREATE POLICY "Admins can update visitors"
ON public.visitors
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);

-- Admins can delete visitors
CREATE POLICY "Admins can delete visitors"
ON public.visitors
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- ANALYTICS EVENTS TABLE
-- Track specific events for analytics
-- ============================================

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Event info
  event_type TEXT NOT NULL, -- 'page_view', 'product_view', 'add_to_cart', 'checkout_start', 'purchase', etc.
  event_data JSONB DEFAULT '{}'::JSONB,
  
  -- Page info
  page_url TEXT,
  page_title TEXT,
  
  -- Product info (for product events)
  product_id UUID,
  product_title TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_visitor ON public.analytics_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_events_session ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.analytics_events(created_at DESC);

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events
CREATE POLICY "Anyone can create events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all events
CREATE POLICY "Admins can view all events"
ON public.analytics_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  )
);

-- ============================================
-- FUNCTIONS FOR REALTIME STATS
-- ============================================

-- Function to get dashboard stats
CREATE OR REPLACE FUNCTION get_dashboard_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_visitors', (SELECT COUNT(*) FROM visitors),
    'visitors_today', (SELECT COUNT(*) FROM visitors WHERE DATE(last_visit_at) = CURRENT_DATE),
    'total_orders', (SELECT COUNT(*) FROM orders),
    'orders_today', (SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURRENT_DATE),
    'pending_orders', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
    'total_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid'),
    'revenue_today', (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE payment_status = 'paid' AND DATE(created_at) = CURRENT_DATE),
    'total_products', (SELECT COUNT(*) FROM products WHERE is_active = true),
    'low_stock_products', (SELECT COUNT(*) FROM products WHERE is_active = true AND stock_quantity <= low_stock_threshold AND stock_quantity > 0),
    'out_of_stock_products', (SELECT COUNT(*) FROM products WHERE is_active = true AND stock_quantity <= 0)
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update visitor on order completion
CREATE OR REPLACE FUNCTION update_visitor_on_order()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to find visitor by phone
  UPDATE visitors
  SET 
    has_ordered = true,
    total_orders = total_orders + 1,
    total_spent = total_spent + NEW.total_amount,
    name = COALESCE(name, NEW.guest_name),
    email = COALESCE(email, NEW.guest_email),
    phone = COALESCE(phone, NEW.guest_phone),
    updated_at = NOW()
  WHERE phone = NEW.guest_phone
     OR email = NEW.guest_email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order completion
DROP TRIGGER IF EXISTS on_order_created ON orders;
CREATE TRIGGER on_order_created
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_on_order();

-- ============================================
-- ENABLE REALTIME FOR TABLES
-- ============================================

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable realtime for visitors
ALTER PUBLICATION supabase_realtime ADD TABLE visitors;

-- Enable realtime for products (for stock updates)
ALTER PUBLICATION supabase_realtime ADD TABLE products;
