-- ============================================
-- FIX: Infinite Recursion in Users RLS Policies
-- ============================================
-- Run these commands in Supabase SQL Editor to fix the issue

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recreate with non-recursive policies
-- Users can view their own profile (no recursion - direct comparison)
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (no recursion)
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (SELECT role FROM public.users WHERE id = auth.uid())
);

-- TEMPORARY: Disable admin-only read policy to unblock login
-- (We'll re-enable this after testing)
-- For now, users can only see their own profile
-- Admins will also only see their own profile until we fix the recursive issue

-- To re-enable admin viewing of all users later, use:
-- CREATE POLICY "Admins can view all users"
-- ON public.users
-- FOR SELECT
-- USING ((SELECT role FROM public.users WHERE id = auth.uid()) = 'admin');
