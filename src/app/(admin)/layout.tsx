import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? 'admin'

  return (
    <div className="portal-shell">
      <AdminSidebar role={role} userEmail={user.email ?? ''} userName={profile?.full_name ?? ''} />
      <main className="portal-main">
        {children}
      </main>
    </div>
  )
}
