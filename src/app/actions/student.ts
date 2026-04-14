'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export interface CreateStudentPayload {
  // Auth
  username: string   // becomes the email: username@students.nexus.edu
  password: string

  // Basic Info
  first_name: string
  last_name: string
  roll_no: string
  gender: string
  phone?: string
  address?: string

  // Academic Info
  year_id: string
  group_id: string
  section_id: string

  // Guardian Info
  guardian_name: string
  guardian_phone: string
}

export interface CreateStudentResult {
  success: true
  email: string
  password: string
  studentId: string
}

export async function createStudent(data: CreateStudentPayload): Promise<CreateStudentResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your-service-role-key-here') {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not configured. Go to Supabase Dashboard → Project Settings → API → service_role, then add it to your .env file.'
    )
  }

  // Admin client — never touches browser session
  const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Build synthetic email from username
  const sanitizedUsername = data.username.trim().toLowerCase().replace(/\s+/g, '.')
  const email = sanitizedUsername.includes('@')
    ? sanitizedUsername
    : `${sanitizedUsername}@students.nexus.edu`

  // 1. Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: data.password,
    email_confirm: true,
    user_metadata: {
      role: 'student',
      roll_no: data.roll_no,
      full_name: `${data.first_name} ${data.last_name}`,
    },
  })

  if (authError) {
    if (authError.message.includes('already registered')) {
      throw new Error(`Username "${data.username}" is already taken. Choose a different one.`)
    }
    throw new Error(`Authentication error: ${authError.message}`)
  }

  if (!authData.user) throw new Error('User was not created. Please try again.')

  const authUserId = authData.user.id

  // 2. Insert student profile — roll back auth user on failure
  const { data: studentRow, error: insertError } = await supabaseAdmin
    .from('students')
    .insert({
      auth_user_id: authUserId,
      roll_no: data.roll_no.trim(),
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      gender: data.gender,
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      year_id: data.year_id,
      group_id: data.group_id,
      section_id: data.section_id,
      guardian_name: data.guardian_name.trim(),
      guardian_phone: data.guardian_phone.trim(),
    })
    .select('id')
    .single()

  if (insertError) {
    // Rollback: delete the auth user we just created
    await supabaseAdmin.auth.admin.deleteUser(authUserId)

    if (insertError.code === '23505') {
      throw new Error(`Roll Number "${data.roll_no}" is already registered.`)
    }
    if (insertError.code === '23503') {
      throw new Error('Selected Year / Group / Section no longer exists. Please refresh and try again.')
    }
    throw new Error(`Database error: ${insertError.message}`)
  }

  return {
    success: true,
    email,
    password: data.password,
    studentId: studentRow.id,
  }
}
