'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateStudentPayload {
  full_name: string
  roll_no: string
  phone?: string
  regulation_id: string
  group_id: string
  section_id: string
  parent_name: string
  parent_mobile: string
  // Optional login credentials
  username?: string
  password?: string
}

export interface CreateStudentResult {
  success: true
  studentId: string
  email?: string
  password?: string
}

export async function createStudent(data: CreateStudentPayload): Promise<CreateStudentResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let authUserId: string | null = null
  let generatedEmail: string | undefined
  let usedPassword: string | undefined

  // If credentials are provided, create an auth user
  if (data.username && data.password) {
    const sanitized = data.username.trim().toLowerCase().replace(/\s+/g, '.')
    generatedEmail = sanitized.includes('@') ? sanitized : `${sanitized}@students.nexus.edu`

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: generatedEmail,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: 'student', roll_no: data.roll_no, full_name: data.full_name },
    })

    if (authError) {
      if (authError.message.includes('already registered')) {
        throw new Error(`Username "${data.username}" is already taken. Choose a different one.`)
      }
      throw new Error(`Auth error: ${authError.message}`)
    }
    authUserId = authData.user?.id ?? null
    usedPassword = data.password

    // Create profile with student role
    if (authUserId) {
      await supabaseAdmin.from('profiles').upsert({
        id: authUserId,
        role: 'student',
        full_name: data.full_name,
      })
    }
  }

  // Insert student record
  const { data: studentRow, error: insertError } = await supabaseAdmin
    .from('students')
    .insert({
      user_id: authUserId,
      roll_no: data.roll_no.trim(),
      full_name: data.full_name.trim(),
      phone: data.phone?.trim() || null,
      parent_name: data.parent_name.trim(),
      parent_mobile: data.parent_mobile.trim(),
      regulation_id: data.regulation_id,
      group_id: data.group_id,
      section_id: data.section_id,
    })
    .select('id')
    .single()

  if (insertError) {
    // Rollback auth user if we created one
    if (authUserId) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
    }
    if (insertError.code === '23505') {
      throw new Error(`Roll Number "${data.roll_no}" is already registered.`)
    }
    if (insertError.code === '23503') {
      throw new Error('Selected Course / Batch / Section no longer exists. Please refresh and try again.')
    }
    throw new Error(`Database error: ${insertError.message}`)
  }

  revalidatePath('/admin/students')

  return {
    success: true,
    studentId: studentRow.id,
    email: generatedEmail,
    password: usedPassword,
  }
}

// ─── Auth Actions ────────────────────────────────────────────────────────────

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

  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return (data?.role as 'admin' | 'student') ?? null
}
