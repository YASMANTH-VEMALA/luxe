-- Product Reviews Table for Admin-created reviews
-- Run this in your Supabase SQL editor

-- Create the product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  reviewer_name VARCHAR(100) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read reviews
CREATE POLICY "Anyone can view reviews"
  ON product_reviews
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert reviews
CREATE POLICY "Admins can create reviews"
  ON product_reviews
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can update reviews
CREATE POLICY "Admins can update reviews"
  ON product_reviews
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can delete reviews
CREATE POLICY "Admins can delete reviews"
  ON product_reviews
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_reviews_updated_at
  BEFORE UPDATE ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STORAGE BUCKET FOR PRODUCT IMAGES
-- ============================================

-- Create the storage bucket for product images
-- Note: Run this in Supabase Dashboard > Storage > Create Bucket
-- Or use this SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Anyone can view product images
CREATE POLICY "Anyone can view product images"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'product-images');

-- Policy: Only admins can upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins can delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
    )
  );
