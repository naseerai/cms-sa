-- ──────────────────────────────────────────────────────────────────────────────
-- Daily Attendance Module — Supabase Migration
-- Run this in the Supabase SQL Editor for your NexusCollege project.
-- ──────────────────────────────────────────────────────────────────────────────

-- 1. Create the attendance table (if it doesn't already exist)
CREATE TABLE IF NOT EXISTS public.attendance (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id  uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  section_id  uuid NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  date        date NOT NULL,
  status      text NOT NULL DEFAULT 'undefined'
                   CHECK (status IN ('present', 'absent', 'holiday', 'undefined')),
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- 2. If the table ALREADY EXISTS from a previous build, run these alter steps:

-- 2a. Drop the old unique constraint that included 'subject'
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_student_id_section_id_subject_date_key;

-- 2b. Make 'subject' nullable (if column exists) so old data isn't broken
ALTER TABLE public.attendance
  ALTER COLUMN subject DROP NOT NULL;

-- 2c. Update the CHECK constraint to include the new statuses
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_status_check;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_status_check
  CHECK (status IN ('present', 'absent', 'holiday', 'undefined'));

-- 2d. Add the new unique constraint (without subject)
ALTER TABLE public.attendance
  DROP CONSTRAINT IF EXISTS attendance_student_section_date_key;

ALTER TABLE public.attendance
  ADD CONSTRAINT attendance_student_section_date_key
  UNIQUE (student_id, section_id, date);

-- 3. Useful index for fast lookups by section + date
CREATE INDEX IF NOT EXISTS idx_attendance_section_date
  ON public.attendance (section_id, date);

-- 4. Row-Level Security — allow authenticated users to manage attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated CRUD on attendance"
  ON public.attendance
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────────────────────────────────────
-- Done. The attendance table is now ready for the Daily Attendance Module.
-- ──────────────────────────────────────────────────────────────────────────────
