// ─── WhatsApp Messaging Utility ──────────────────────────────────────────────
// Server-side only. All env vars are server-side (no NEXT_PUBLIC_ prefix).

type TemplateName = 'logged_in' | 'loggeddd_out' | 'salary_credited' | 'crmlead' | 'absent_student';

// ─── Core send function ───────────────────────────────────────────────────────

export async function sendWhatsAppMessage(
  to: string,
  templateName: TemplateName,
  variables: string[]
): Promise<{ success: boolean; data?: unknown; error?: unknown }> {
  // Guard: skip if no mobile provided
  if (!to || !to.trim()) {
    console.warn('[WhatsApp] Skipped — empty recipient number.')
    return { success: false, error: 'Empty recipient number' }
  }

  // Normalise: strip all non-digits, ensure country code (91 for India if 10 digits)
  const cleanNumber = to.replace(/\D/g, '')
  const finalNumber =
    cleanNumber.length === 10 ? `91${cleanNumber}` : cleanNumber

  const body = {
    to: finalNumber,
    recipient_type: 'individual',
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en', policy: 'deterministic' },
      components: [
        {
          type: 'body',
          parameters: variables.map((v) => ({ type: 'text', text: v })),
        },
      ],
    },
  }

  try {
    const response = await fetch(process.env.WHATSAPP_API_URL!, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('[WhatsApp] API error:', JSON.stringify(data))
    } else {
      console.log(`[WhatsApp] ✓ Sent "${templateName}" → ${finalNumber}`)
    }

    return { success: response.ok, data }
  } catch (error) {
    console.error('[WhatsApp] Network/fetch error:', error)
    return { success: false, error }
  }
}

// ─── Attendance batch sender ──────────────────────────────────────────────────
// Called after attendance is saved.  Fires all messages in the background with
// Promise.allSettled so individual failures never block or crash the caller.

export interface AttendanceStudentInfo {
  id: string
  full_name: string
  parent_mobile: string
  status: 'present' | 'absent' | 'holiday' | 'undefined'
}

/**
 * Dispatches WhatsApp messages for every student in the list.
 *  - present  → `logged_in`  template  (vars: student_name, date, time)
 *  - absent   → `crmlead`    template  (vars: student_name, date, 'Absent')
 *  - holiday / undefined → skipped
 *
 * Returns a summary object for optional logging.
 */
export async function sendAttendanceWhatsApp(
  students: AttendanceStudentInfo[],
  date: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  const TIME = '09:00 AM'
  let sent = 0, failed = 0, skipped = 0

  const tasks = students
    .filter((s) => s.status === 'present' || s.status === 'absent')
    .filter((s) => !!s.parent_mobile?.trim())
    .map(async (s) => {
      let result: { success: boolean }

      if (s.status === 'present') {
        result = await sendWhatsAppMessage(s.parent_mobile, 'logged_in', [
          s.full_name,
          date,
          TIME,
        ])
      } else {
        // absent — use crmlead as fallback (no dedicated absent template yet)
        result = await sendWhatsAppMessage(s.parent_mobile, 'crmlead', [
          s.full_name,
          date,
          'Absent',
        ])
      }

      return { studentId: s.id, success: result.success }
    })

  // Students without parent_mobile are counted as skipped
  skipped = students.filter(
    (s) =>
      (s.status === 'present' || s.status === 'absent') &&
      !s.parent_mobile?.trim()
  ).length
  // Also skip holiday/undefined
  skipped += students.filter(
    (s) => s.status === 'holiday' || s.status === 'undefined'
  ).length

  const results = await Promise.allSettled(tasks)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) sent++
    else failed++
  }

  console.log(
    `[WhatsApp/Attendance] date=${date} sent=${sent} failed=${failed} skipped=${skipped}`
  )
  return { sent, failed, skipped }
}

// ─── Notice blast sender ──────────────────────────────────────────────────────
// Sends a crmlead message to all parent mobiles when a new notice is posted.

export interface ParentContact {
  parent_mobile: string
}

/**
 * Sends the crmlead template to every parent in the list.
 * Variables: [title, date, shortContent]
 */
export async function sendNoticeWhatsApp(
  parents: ParentContact[],
  title: string,
  date: string,
  shortContent: string
): Promise<{ sent: number; failed: number; skipped: number }> {
  let sent = 0, failed = 0, skipped = 0

  const eligible = parents.filter((p) => !!p.parent_mobile?.trim())
  skipped = parents.length - eligible.length

  const tasks = eligible.map((p) =>
    sendWhatsAppMessage(p.parent_mobile, 'crmlead', [title, date, shortContent])
  )

  const results = await Promise.allSettled(tasks)
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.success) sent++
    else failed++
  }

  console.log(
    `[WhatsApp/Notice] title="${title}" sent=${sent} failed=${failed} skipped=${skipped}`
  )
  return { sent, failed, skipped }
}