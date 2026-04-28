'use server'

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function adminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export interface TeacherRecord {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

/**
 * Fetches all profiles with role='teacher', enriched with auth email.
 */
export async function getTeachers(): Promise<TeacherRecord[]> {
  const supabase = adminClient()

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('role', 'teacher')

  if (error) throw new Error(error.message)
  if (!profiles || profiles.length === 0) return []

  const { data: usersData, error: authError } = await supabase.auth.admin.listUsers()
  if (authError) throw new Error(authError.message)

  const profileIds = new Set(profiles.map((p) => p.id))
  const teachers = (usersData?.users ?? [])
    .filter((u) => profileIds.has(u.id))
    .map((u) => {
      const profile = profiles.find((p) => p.id === u.id)
      return {
        id: u.id,
        full_name: profile?.full_name ?? null,
        email: u.email ?? null,
        created_at: u.created_at,
      }
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return teachers
}

/**
 * Removes a teacher: sets their profile role back to 'student'
 * (soft remove — does not delete the auth user).
 */
export async function removeTeacher(userId: string): Promise<void> {
  const supabase = adminClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'student' })
    .eq('id', userId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/teachers')
}

/**
 * Promotes an existing user to teacher role.
 */
export async function promoteToTeacher(userId: string): Promise<void> {
  const supabase = adminClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'teacher' })
    .eq('id', userId)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/teachers')
}

/**
 * Updates a student's auth credentials (email and/or password).
 * Must be called server-side only (uses service role key).
 */
export async function updateStudentAccount(
  userId: string,
  updates: { email?: string; password?: string }
): Promise<void> {
  if (!userId) throw new Error('No user ID provided')
  if (!updates.email && !updates.password) return

  const supabase = adminClient()
  const payload: { email?: string; password?: string } = {}
  if (updates.email) payload.email = updates.email.trim().toLowerCase()
  if (updates.password) payload.password = updates.password

  const { error } = await supabase.auth.admin.updateUserById(userId, payload)
  if (error) throw new Error(error.message)
}

const DEFAULT_TEACHER_PASSWORD = 'Nexus@Teacher123'
const EMAIL_DOMAIN = '@nexuscollege.com'

export interface CreateTeacherPayload {
  full_name: string
  email_prefix: string
  password?: string
}

export interface CreateTeacherResult {
  id: string
  full_name: string
  email: string
  created_at: string
  password: string
}

/**
 * Creates a new teacher: auth account + profile with role='teacher'.
 * Email is email_prefix + @nexuscollege.com.
 * Password defaults to Nexus@Teacher123 if not provided.
 */
export async function createTeacher(payload: CreateTeacherPayload): Promise<CreateTeacherResult> {
  const supabase = adminClient()
  const email = `${payload.email_prefix.trim().toLowerCase()}${EMAIL_DOMAIN}`
  const password = payload.password?.trim() || DEFAULT_TEACHER_PASSWORD
  const fullName = payload.full_name.trim()

  // Create auth user
  // Create auth user OR link existing one
let userId: string

const { data: authData, error: authError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { role: 'teacher', full_name: fullName },
})

if (authError) {
  const msg = authError.message.toLowerCase()

  if (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('email address has already')
  ) {
    const { data: usersData, error: listError } =
      await supabase.auth.admin.listUsers()

    if (listError) {
      throw new Error(`Failed to fetch existing users: ${listError.message}`)
    }

    const existingUser = usersData.users.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!existingUser) {
      throw new Error(`Email "${email}" exists but user could not be found.`)
    }

    userId = existingUser.id
  } else {
    throw new Error(`Auth error: ${authError.message}`)
  }
} else {
  userId = authData.user!.id
}

  // Upsert profile with teacher role
  const { error: profileError } = await supabase
  .from('profiles')
  .upsert(
    {
      id: userId,
      role: 'teacher',
      full_name: fullName,
      email: email,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'id',
    }
  )
  if (profileError) {
    // Rollback auth user
    if (authData?.user?.id) {
  await supabase.auth.admin.deleteUser(userId)
}
    throw new Error(`Profile error: ${profileError.message}`)
  }

  revalidatePath('/admin/teachers')

  return {
    id: userId,
    full_name: fullName,
    email,
    created_at: authData?.user?.created_at || new Date().toISOString(),
    password,
  }
}
export async function updateTeacher(
  userId: string,
  updates: {
    full_name?: string
    email?: string
    password?: string
  }
): Promise<void> {
  const supabase = adminClient()

  // Update auth account
  if (updates.email || updates.password) {
    const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
      email: updates.email?.trim().toLowerCase(),
      password: updates.password || undefined,
    })

    if (authError) throw new Error(authError.message)
  }

  // Update profile
  if (updates.full_name || updates.email) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        email: updates.email,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (profileError) throw new Error(profileError.message)
  }

  revalidatePath('/admin/teachers')
}
/**
 * Permanently deletes a teacher: removes auth user + profile.
 */
export async function deleteTeacher(userId: string): Promise<void> {
  const supabase = adminClient()
  // Delete auth user (cascade deletes profile if RLS allows, else delete separately)
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId)
  if (authErr) throw new Error(authErr.message)
  // Also explicitly delete profile in case cascade isn't set up
  await supabase.from('profiles').delete().eq('id', userId)
  revalidatePath('/admin/teachers')
}

