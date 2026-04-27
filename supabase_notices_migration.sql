-- ──────────────────────────────────────────────────────────────────────────────
-- Notices Module — Supabase Migration
-- Run this in the Supabase SQL Editor for your NexusCollege project.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Create the notices table
CREATE TABLE IF NOT EXISTS public.notices (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title       text NOT NULL,
  content     text NOT NULL,
  created_at  timestamptz DEFAULT now()
);

-- 2. Enable Row-Level Security
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;

-- 3. Any authenticated user can read notices (public board)
CREATE POLICY IF NOT EXISTS "Allow authenticated read on notices"
  ON public.notices
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- 4. Only admins/teachers can insert notices
--    (adjust this if you want a stricter role check)
CREATE POLICY IF NOT EXISTS "Allow authenticated insert on notices"
  ON public.notices
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Allow authenticated users to delete notices (admin only in practice)
CREATE POLICY IF NOT EXISTS "Allow authenticated delete on notices"
  ON public.notices
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────────────────────
-- Student Dashboard Fix — RLS policy for students table
-- If students see "Profile not linked", run these statements too:
-- ──────────────────────────────────────────────────────────────────────────────

-- Allow a student to read their own row (matched by user_id = auth.uid())
CREATE POLICY IF NOT EXISTS "Students can read their own record"
  ON public.students
  FOR SELECT
  USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────────
-- Done. Run supabase_attendance_migration.sql first if you haven't already.
-- ──────────────────────────────────────────────────────────────────────────────
