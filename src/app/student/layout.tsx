import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import StudentSidebar from '@/components/StudentSidebar'

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'student') redirect('/admin')

  return (
    <div className="portal-shell">
      <StudentSidebar userEmail={user.email ?? ''} />
      <main className="portal-main">
        {children}
      </main>
    </div>
  )
}
