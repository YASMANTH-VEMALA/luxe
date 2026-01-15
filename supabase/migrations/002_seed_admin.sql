-- ============================================
-- SEED ADMIN USER
-- Run this AFTER the admin signs in with Google
-- ============================================

-- First, find the user by email and add them as super_admin
-- Replace with actual user_id after first Google sign-in

DO $$
DECLARE
  admin_user_id UUID;
BEGIN
  -- Find the user by email
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'yasmanthvemala007@gmail.com'
  LIMIT 1;
  
  -- If user exists, add them as super_admin
  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_users (user_id, email, role)
    VALUES (admin_user_id, 'yasmanthvemala007@gmail.com', 'super_admin')
    ON CONFLICT (email) DO UPDATE SET role = 'super_admin';
    
    RAISE NOTICE 'Admin user created/updated successfully for yasmanthvemala007@gmail.com';
  ELSE
    RAISE NOTICE 'User yasmanthvemala007@gmail.com not found. Please sign in with Google first.';
  END IF;
END $$;
