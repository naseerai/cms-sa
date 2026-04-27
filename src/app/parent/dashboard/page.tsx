import { createClient } from '@/utils/supabase/server'
import ParentDashboardClient from './ParentDashboardClient'

export const metadata = {
  title: 'Parent Portal — NexusCollege',
  description: 'View your child\'s attendance and school notices.',
}

export default async function ParentDashboardPage() {
  const supabase = await createClient()

  // Pre-fetch notices server-side for initial render
  const { data: notices = [] } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  return <ParentDashboardClient initialNotices={notices ?? []} />
}
