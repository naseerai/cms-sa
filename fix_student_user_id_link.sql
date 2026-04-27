-- ════════════════════════════════════════════════════════════════════
-- RUN THIS IN: Supabase Dashboard → SQL Editor
-- Purpose: Ensure user_id column exists + correct RLS policies
-- ════════════════════════════════════════════════════════════════════

-- STEP 1 ── Add user_id column to students (safe — does nothing if exists)
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- STEP 2 ── Add index for fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students (user_id);

-- STEP 3 ── Enable RLS on students (safe if already enabled)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- STEP 4 ── Drop old policies to avoid duplicates, then recreate cleanly
DROP POLICY IF EXISTS "Students can read their own record" ON public.students;
DROP POLICY IF EXISTS "Allow authenticated read on students" ON public.students;

-- Students can read ONLY their own row
CREATE POLICY "Students can read their own record"
  ON public.students
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role (used by the server action) can do everything
-- (service_role bypasses RLS automatically — no policy needed)

-- STEP 5 ── Attendance: students can read their own records
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can read their own attendance" ON public.attendance;
CREATE POLICY "Students can read their own attendance"
  ON public.attendance
  FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM public.students WHERE user_id = auth.uid()
    )
  );

-- STEP 6 ── Notices: all authenticated users can read
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow authenticated read on notices" ON public.notices;
CREATE POLICY "Allow authenticated read on notices"
  ON public.notices
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- ════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC: See which students still have user_id = NULL
-- ════════════════════════════════════════════════════════════════════
-- SELECT id, full_name, roll_no, user_id FROM public.students WHERE user_id IS NULL;

-- ════════════════════════════════════════════════════════════════════
-- FIX EXISTING STUDENTS: Run one UPDATE per affected student.
-- Get the student's Auth UID from: Supabase → Authentication → Users
-- OR from the "Profile Not Linked" error screen on the dashboard.
-- ════════════════════════════════════════════════════════════════════
-- UPDATE public.students
-- SET user_id = 'PASTE-AUTH-UID-HERE'
-- WHERE roll_no = 'STUDENT-ROLL-NO-HERE';

-- ════════════════════════════════════════════════════════════════════
-- DONE. New enrollments will always have user_id set automatically.
-- ════════════════════════════════════════════════════════════════════
