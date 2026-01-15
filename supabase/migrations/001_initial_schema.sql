-- ============================================
-- LUXE E-COMMERCE DATABASE SCHEMA
-- Secure, production-ready schema with RLS
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a private schema for admin functions (not exposed via API)
CREATE SCHEMA IF NOT EXISTS private;

-- ============================================
-- ADMIN USERS TABLE (Secure)
-- ============================================

CREATE TABLE public.admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX idx_admin_users_user_id ON public.admin_users(user_id);
CREATE INDEX idx_admin_users_email ON public.admin_users(email);

-- ============================================
-- SECURE is_admin() FUNCTION
-- SECURITY DEFINER runs with elevated privileges
-- ============================================

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = (SELECT auth.uid())
  );
END;
$$;

-- RLS Policy: Only super_admins can view admin list
CREATE POLICY "Super admins can view admin users"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users au
    WHERE au.user_id = (SELECT auth.uid())
    AND au.role = 'super_admin'
  )
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  display_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_categories_slug ON public.categories(slug);
CREATE INDEX idx_categories_active ON public.categories(is_active);

-- Anyone can view active categories
CREATE POLICY "Public can view active categories"
ON public.categories
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can view all categories
CREATE POLICY "Admins can view all categories"
ON public.categories
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));

-- Admins can manage categories
CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
TO authenticated
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can update categories"
ON public.categories
FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
TO authenticated
USING ((SELECT private.is_admin()));

-- ============================================
-- PRODUCTS TABLE
-- ============================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT NOT NULL,
  
  -- Pricing (stored in paise for precision)
  price INTEGER NOT NULL,
  sale_price INTEGER,
  
  -- Product details
  images TEXT[] DEFAULT '{}',
  sizes TEXT[] DEFAULT NULL,
  
  -- Stock & Display
  stock_quantity INTEGER DEFAULT 100,
  low_stock_threshold INTEGER DEFAULT 10,
  show_stock_count BOOLEAN DEFAULT false,
  
  -- Urgency triggers
  fake_viewers INTEGER DEFAULT 0,
  fake_sold_count INTEGER DEFAULT 0,
  
  -- Flags
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_products_slug ON public.products(slug);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_active ON public.products(is_active);
CREATE INDEX idx_products_featured ON public.products(is_featured);
CREATE INDEX idx_products_price ON public.products(price);
CREATE INDEX idx_products_created ON public.products(created_at DESC);

-- Anyone can view active products
CREATE POLICY "Public can view active products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can view all products
CREATE POLICY "Admins can view all products"
ON public.products
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));

-- Admins can manage products
CREATE POLICY "Admins can insert products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can update products"
ON public.products
FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "Admins can delete products"
ON public.products
FOR DELETE
TO authenticated
USING ((SELECT private.is_admin()));

-- ============================================
-- ORDERS TABLE
-- ============================================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  
  -- User reference (nullable for guest checkout)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Guest information
  guest_name TEXT NOT NULL,
  guest_phone TEXT NOT NULL,
  guest_email TEXT,
  
  -- Shipping address (JSONB for flexibility)
  shipping_address JSONB NOT NULL,
  
  -- Cart items (JSONB array)
  cart_items JSONB NOT NULL,
  
  -- Pricing
  subtotal INTEGER NOT NULL,
  cod_charges INTEGER DEFAULT 0,
  shipping_charges INTEGER DEFAULT 0,
  total_amount INTEGER NOT NULL,
  
  -- Payment
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'razorpay')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  
  -- Order Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  
  -- Tracking
  tracking_number TEXT,
  tracking_url TEXT,
  
  -- Notes
  customer_notes TEXT,
  admin_notes TEXT,
  
  -- Timestamps
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_order_number ON public.orders(order_number);
CREATE INDEX idx_orders_user_id ON public.orders(user_id);
CREATE INDEX idx_orders_guest_phone ON public.orders(guest_phone);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_orders_created ON public.orders(created_at DESC);

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
ON public.orders
FOR SELECT
TO authenticated
USING (user_id = (SELECT auth.uid()));

-- Allow anyone to insert orders (guest checkout)
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));

-- Admins can update orders
CREATE POLICY "Admins can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

-- ============================================
-- PINCODES TABLE
-- ============================================

CREATE TABLE public.pincodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pincode TEXT NOT NULL UNIQUE,
  city TEXT,
  state TEXT,
  is_cod_available BOOLEAN DEFAULT true,
  delivery_days INTEGER DEFAULT 5,
  shipping_charge INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pincodes ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_pincodes_pincode ON public.pincodes(pincode);
CREATE INDEX idx_pincodes_active ON public.pincodes(is_active);

-- Anyone can check pincodes
CREATE POLICY "Public can view active pincodes"
ON public.pincodes
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Admins can manage pincodes
CREATE POLICY "Admins can manage pincodes"
ON public.pincodes
FOR ALL
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

-- ============================================
-- USER PROFILES TABLE
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = (SELECT auth.uid()));

-- ============================================
-- FUNCTIONS
-- ============================================

-- Generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'LUX' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Create slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9\s]', '', 'g'), '\s+', '-', 'g')) || '-' || SUBSTRING(gen_random_uuid()::TEXT, 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default categories
INSERT INTO public.categories (name, slug, description, display_order) VALUES
  ('Jewelry', 'jewelry', 'Beautiful handcrafted jewelry pieces', 1),
  ('Dresses', 'dresses', 'Trendy and elegant dresses', 2)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample pincodes (common Indian cities)
INSERT INTO public.pincodes (pincode, city, state, is_cod_available, delivery_days) VALUES
  ('110001', 'New Delhi', 'Delhi', true, 3),
  ('400001', 'Mumbai', 'Maharashtra', true, 3),
  ('560001', 'Bangalore', 'Karnataka', true, 4),
  ('600001', 'Chennai', 'Tamil Nadu', true, 4),
  ('700001', 'Kolkata', 'West Bengal', true, 4),
  ('500001', 'Hyderabad', 'Telangana', true, 4),
  ('380001', 'Ahmedabad', 'Gujarat', true, 4),
  ('411001', 'Pune', 'Maharashtra', true, 4),
  ('302001', 'Jaipur', 'Rajasthan', true, 5),
  ('226001', 'Lucknow', 'Uttar Pradesh', true, 5)
ON CONFLICT (pincode) DO NOTHING;

-- Insert sample products
INSERT INTO public.products (title, slug, description, category, price, sale_price, images, sizes, is_featured, fake_viewers, fake_sold_count) VALUES
  ('Elegant Gold Plated Necklace', 'elegant-gold-plated-necklace', 'Beautiful gold plated necklace perfect for any occasion. Crafted with premium materials for lasting shine.', 'Jewelry', 149900, 99900, ARRAY['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=500'], NULL, true, 15, 45),
  ('Pearl Drop Earrings', 'pearl-drop-earrings', 'Classic pearl drop earrings that add elegance to any outfit. Lightweight and comfortable for all-day wear.', 'Jewelry', 79900, 59900, ARRAY['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=500'], NULL, true, 12, 32),
  ('Diamond Cut Bracelet', 'diamond-cut-bracelet', 'Stunning diamond cut bracelet with intricate detailing. Perfect gift for your loved ones.', 'Jewelry', 129900, 89900, ARRAY['https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=500'], NULL, false, 8, 28),
  ('Traditional Kundan Set', 'traditional-kundan-set', 'Complete kundan jewelry set including necklace and earrings. Perfect for weddings and festivals.', 'Jewelry', 249900, 179900, ARRAY['https://images.unsplash.com/photo-1602173574767-37ac01994b2a?w=500'], NULL, true, 20, 67),
  ('Silver Anklet Pair', 'silver-anklet-pair', 'Delicate silver anklets with traditional design. Adjustable size fits all.', 'Jewelry', 49900, 34900, ARRAY['https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=500'], NULL, false, 6, 19),
  ('Floral Maxi Dress', 'floral-maxi-dress', 'Beautiful floral print maxi dress perfect for summer. Lightweight and flowy fabric.', 'Dresses', 179900, 129900, ARRAY['https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500'], ARRAY['S', 'M', 'L', 'XL'], true, 18, 54),
  ('Elegant Evening Gown', 'elegant-evening-gown', 'Sophisticated evening gown for special occasions. Flattering silhouette with premium fabric.', 'Dresses', 299900, 229900, ARRAY['https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=500'], ARRAY['S', 'M', 'L'], true, 14, 38),
  ('Casual Cotton Kurti', 'casual-cotton-kurti', 'Comfortable cotton kurti for everyday wear. Breathable fabric perfect for Indian weather.', 'Dresses', 89900, 69900, ARRAY['https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=500'], ARRAY['S', 'M', 'L', 'XL', 'XXL'], false, 22, 89),
  ('Party Wear Anarkali', 'party-wear-anarkali', 'Stunning anarkali suit with intricate embroidery. Perfect for parties and celebrations.', 'Dresses', 349900, 279900, ARRAY['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=500'], ARRAY['S', 'M', 'L', 'XL'], true, 16, 42),
  ('Bohemian Print Dress', 'bohemian-print-dress', 'Trendy bohemian style dress with unique print. Comfortable fit for casual outings.', 'Dresses', 149900, 109900, ARRAY['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=500'], ARRAY['S', 'M', 'L'], false, 11, 35)
ON CONFLICT (slug) DO NOTHING;
