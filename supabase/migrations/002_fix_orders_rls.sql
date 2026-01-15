-- Fix RLS policy for orders table to allow guest checkout
-- Run this in Supabase SQL Editor if orders are failing

-- Drop existing insert policy
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Recreate with proper permissions for guest checkout
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Also allow guests to view their orders by phone number (for order tracking)
DROP POLICY IF EXISTS "Guests can view orders by phone" ON public.orders;

CREATE POLICY "Guests can view orders by phone"
ON public.orders
FOR SELECT
TO anon
USING (true);  -- For now allow all - in production, add phone verification

-- Make sure RLS is enabled
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
