-- ─── WhatsApp Logs Table ──────────────────────────────────────────────────────
-- Run this once in your Supabase SQL Editor to enable WhatsApp send logging.
-- The server actions try to insert into this table; if the table doesn't exist,
-- it logs a warning to the console and continues silently.

create table if not exists public.whatsapp_logs (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),

  -- Who was the message for?
  student_id    uuid references public.students(id) on delete set null,
  parent_mobile text,

  -- What was sent?
  template      text not null,          -- e.g. 'logged_in', 'crmlead'
  type          text not null,          -- 'attendance' | 'notice'
  date          text,                   -- ISO date for attendance, formatted for notices
  notice_title  text,                   -- only for type='notice'

  -- Result (updated after send attempt, or left null if not yet tracked)
  success       boolean
);

-- Optional: index for lookups by student
create index if not exists whatsapp_logs_student_id_idx
  on public.whatsapp_logs (student_id);

-- Optional: index for date-based queries
create index if not exists whatsapp_logs_created_at_idx
  on public.whatsapp_logs (created_at desc);

-- RLS: only service role can write (server-side actions use service role key)
alter table public.whatsapp_logs enable row level security;

-- Admins can read logs through their policy if desired
create policy "Admins can view whatsapp_logs"
  on public.whatsapp_logs
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('admin', 'superadmin')
    )
  );
