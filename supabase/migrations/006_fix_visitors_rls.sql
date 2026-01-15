-- ============================================
-- FIX VISITORS RLS INFINITE RECURSION
-- The visitors policies were directly querying admin_users
-- which has its own RLS, causing infinite recursion.
-- Solution: Use private.is_admin() function instead.
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Admins can view all visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can update visitors" ON public.visitors;
DROP POLICY IF EXISTS "Admins can delete visitors" ON public.visitors;

-- Recreate policies using private.is_admin() function
-- This function has SECURITY DEFINER so it bypasses RLS

CREATE POLICY "Admins can view all visitors"
ON public.visitors
FOR SELECT
TO authenticated
USING ((SELECT private.is_admin()));

CREATE POLICY "Admins can update visitors"
ON public.visitors
FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()));

CREATE POLICY "Admins can delete visitors"
ON public.visitors
FOR DELETE
TO authenticated
USING ((SELECT private.is_admin()));

-- Also fix analytics_events if it has similar issues
DROP POLICY IF EXISTS "Admins can view all events" ON public.analytics_events;
DROP POLICY IF EXISTS "Admins can delete events" ON public.analytics_events;

-- Check if analytics_events table exists and has RLS enabled
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'analytics_events' AND table_schema = 'public') THEN
    -- Recreate admin policies for analytics_events using private.is_admin()
    EXECUTE 'CREATE POLICY "Admins can view all events" ON public.analytics_events FOR SELECT TO authenticated USING ((SELECT private.is_admin()))';
    EXECUTE 'CREATE POLICY "Admins can delete events" ON public.analytics_events FOR DELETE TO authenticated USING ((SELECT private.is_admin()))';
  END IF;
END $$;
