'use server'

/**
 * Server Actions for WhatsApp notifications.
 *
 * These are the only entry-points client components should use.
 * All secrets (WHATSAPP_API_URL, WHATSAPP_ACCESS_TOKEN) live in server
 * env vars and are never sent to the browser.
 */

import { createClient as createAdminClient } from '@supabase/supabase-js'
import {
  sendAttendanceWhatsApp,
  sendNoticeWhatsApp,
  type AttendanceStudentInfo,
} from '@/utils/supabase/whatsapp'

// ─── Admin Supabase client ────────────────────────────────────────────────────

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── Attendance notifications ─────────────────────────────────────────────────

/**
 * Called by AttendanceManager after a successful DB upsert.
 *
 * @param sectionId  – used to fetch students with parent_mobile
 * @param attendance – map of { [studentId]: status }
 * @param date       – ISO date string, e.g. "2026-05-20"
 */
export async function notifyAttendanceWhatsApp(
  sectionId: string,
  attendance: Record<string, 'present' | 'absent' | 'holiday' | 'undefined'>,
  date: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  try {
    const admin = getAdmin()

    // Fetch student names + parent mobiles for this section
    const { data: rows, error } = await admin
      .from('students')
      .select('id, full_name, parent_mobile')
      .eq('section_id', sectionId)

    if (error) {
      console.error('[WA/Action] Failed to fetch students:', error.message)
      return { sent: 0, failed: 0, skipped: 0 }
    }

    const students: AttendanceStudentInfo[] = (rows ?? []).map((r) => ({
      id: r.id,
      full_name: r.full_name ?? '',
      parent_mobile: r.parent_mobile ?? '',
      status: attendance[r.id] ?? 'undefined',
    }))

    // Log intent to DB (whatsapp_logs table — non-fatal if table absent)
    const logRows = students
      .filter((s) => s.status === 'present' || s.status === 'absent')
      .map((s) => ({
        student_id: s.id,
        parent_mobile: s.parent_mobile,
        template: s.status === 'present' ? 'logged_in' : 'crmlead',
        date,
        type: 'attendance',
      }))

    if (logRows.length > 0) {
      await admin
        .from('whatsapp_logs')
        .insert(logRows)
        .then(({ error: le }) => {
          if (le) console.warn('[WA/Action] Log insert warn (table may not exist yet):', le.message)
        })
    }

    return await sendAttendanceWhatsApp(students, date)
  } catch (err) {
    console.error('[WA/Action] notifyAttendanceWhatsApp error:', err)
    return { sent: 0, failed: 0, skipped: 0 }
  }
}

// ─── Notice broadcast ─────────────────────────────────────────────────────────

/**
 * Called by NoticeBoard after a notice is successfully inserted.
 * Fetches every student's parent_mobile and sends the crmlead template.
 *
 * @param title        – notice title (template variable 1)
 * @param date         – formatted date string  (template variable 2)
 * @param shortContent – first 100 chars of content (template variable 3)
 */
export async function notifyNoticeWhatsApp(
  title: string,
  date: string,
  shortContent: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  try {
    const admin = getAdmin()

    const { data: rows, error } = await admin
      .from('students')
      .select('parent_mobile')

    if (error) {
      console.error('[WA/Action] Failed to fetch parent mobiles:', error.message)
      return { sent: 0, failed: 0, skipped: 0 }
    }

    const parents = (rows ?? []).map((r) => ({
      parent_mobile: r.parent_mobile ?? '',
    }))

    // Log to whatsapp_logs (non-fatal)
    const logRows = parents
      .filter((p) => !!p.parent_mobile?.trim())
      .map((p) => ({
        parent_mobile: p.parent_mobile,
        template: 'crmlead',
        date,
        type: 'notice',
        notice_title: title,
      }))

    if (logRows.length > 0) {
      await admin
        .from('whatsapp_logs')
        .insert(logRows)
        .then(({ error: le }) => {
          if (le) console.warn('[WA/Action] Log insert warn (table may not exist yet):', le.message)
        })
    }

    return await sendNoticeWhatsApp(parents, title, date, shortContent)
  } catch (err) {
    console.error('[WA/Action] notifyNoticeWhatsApp error:', err)
    return { sent: 0, failed: 0, skipped: 0 }
  }
}
