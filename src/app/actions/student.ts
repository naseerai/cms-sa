'use server'

import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateStudentPayload {
  full_name: string
  roll_no: string
  phone?: string
  regulation_id: string
  group_id: string
  section_id: string
  parent_name: string
  parent_mobile: string
  username?: string  // full email address (prefix + domain, assembled by the form)
  password?: string
}

export interface CreateStudentResult {
  success: true
  studentId: string
  email: string
  password: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generatePassword(length = 12): string {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env')
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env')
  return createAdminClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// ─── createStudent ────────────────────────────────────────────────────────────
// Steps:
//   A → auth.admin.createUser  (gets newUserId)
//   B → students.insert        (includes user_id: newUserId)
//   C → students.update        (belt-and-suspenders: sets user_id again by id)

export async function createStudent(data: CreateStudentPayload): Promise<CreateStudentResult> {
  const admin = getAdminClient()

  // ── A. Resolve credentials ────────────────────────────────────────────────
  const domain       = process.env.STUDENT_EMAIL_DOMAIN || 'nexuscollege.com'
  const slug         = data.roll_no.trim().toLowerCase()
                         .replace(/\s+/g, '.')
                         .replace(/[^a-z0-9._-]/g, '')
  const finalEmail    = data.username?.trim().toLowerCase() || `${slug}@${domain}`
  const finalPassword = data.password?.trim() || generatePassword()

  // ── A. Create auth user ───────────────────────────────────────────────────
  console.log('[createStudent] Step A — creating auth user:', finalEmail)
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email:         finalEmail,
    password:      finalPassword,
    email_confirm: true,
    user_metadata: { role: 'student', roll_no: data.roll_no, full_name: data.full_name },
  })

  if (authError) {
    console.error('[createStudent] Auth error:', authError)
    if (authError.message.toLowerCase().includes('already registered')) {
      throw new Error(`Email "${finalEmail}" is already registered. Choose a different email prefix.`)
    }
    throw new Error(`Auth error: ${authError.message}`)
  }

  // ── B. Capture newUserId ──────────────────────────────────────────────────
  const newUserId = authData.user?.id
  if (!newUserId) throw new Error('auth.admin.createUser succeeded but returned no user id.')
  console.log('[createStudent] Step B — newUserId:', newUserId)

  // Profile row (non-fatal if it fails)
  await admin.from('profiles').upsert({ id: newUserId, role: 'student', full_name: data.full_name })
    .then(({ error: e }) => { if (e) console.warn('[createStudent] profile upsert warn:', e.message) })

  // ── C. Insert student row — user_id set on INSERT ─────────────────────────
  console.log('[createStudent] Step C — inserting student with user_id:', newUserId)
  const { data: studentRow, error: insertError } = await admin
    .from('students')
    .insert({
      user_id:       newUserId,          // ← explicitly set to newUserId
      roll_no:       data.roll_no.trim(),
      full_name:     data.full_name.trim(),
      phone:         data.phone?.trim() || null,
      parent_name:   data.parent_name.trim(),
      parent_mobile: data.parent_mobile.trim(),
      regulation_id: data.regulation_id,
      group_id:      data.group_id,
      section_id:    data.section_id,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[createStudent] Insert error:', insertError)
    // Rollback auth user to prevent orphans
    await admin.auth.admin.deleteUser(newUserId).catch(e =>
      console.error('[createStudent] Rollback failed:', e)
    )
    if (insertError.code === '23505') throw new Error(`Roll number "${data.roll_no}" is already registered.`)
    if (insertError.code === '23503') throw new Error('Selected Regulation / Group / Section no longer exists.')
    throw new Error(`DB insert error (${insertError.code}): ${insertError.message}`)
  }

  const studentId = studentRow.id
  console.log('[createStudent] Inserted student row id:', studentId)

  // ── Belt-and-suspenders: UPDATE user_id in case INSERT missed it ──────────
  const { error: updateError } = await admin
    .from('students')
    .update({ user_id: newUserId })
    .eq('id', studentId)

  if (updateError) {
    // Not fatal — log it but don't abort (the INSERT should have already set it)
    console.error('[createStudent] Belt-and-suspenders UPDATE error:', updateError.message)
  } else {
    console.log('[createStudent] Belt-and-suspenders UPDATE succeeded — user_id confirmed:', newUserId)
  }

  revalidatePath('/admin/students')

  return {
    success:   true,
    studentId,
    email:     finalEmail,
    password:  finalPassword,
  }
}

// ─── linkStudentUser ──────────────────────────────────────────────────────────
// Fix an existing student (enrolled with user_id=null) by setting user_id manually.

export async function linkStudentUser(rollNo: string, authUserId: string): Promise<void> {
  const admin = getAdminClient()
  const { error } = await admin
    .from('students')
    .update({ user_id: authUserId })
    .eq('roll_no', rollNo.trim())
  if (error) throw new Error(`Link failed (${error.code}): ${error.message}`)
  revalidatePath('/admin/students')
}

// ─── Auth helpers ─────────────────────────────────────────────────────────────

export async function signIn(email: string, password: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return data
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getUserRole(): Promise<'admin' | 'student' | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return (data?.role as 'admin' | 'student') ?? null
}
