import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function StudentNoticesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notices } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <p className="text-sm font-semibold text-indigo-500 uppercase tracking-widest">
          Student Portal
        </p>
        <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
          Notice Board
        </h1>
        <p className="text-slate-500 mt-2">
          View all college announcements and updates.
        </p>
      </div>

      <div className="space-y-4">
        {notices?.length ? (
          notices.map((notice) => (
            <div
              key={notice.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2 className="text-lg font-bold text-slate-800">
                  {notice.title}
                </h2>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  {new Date(notice.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {notice.content}
              </p>
            </div>
          ))
        ) : (
          <div className="text-center py-16 text-slate-400">
            No notices available.
          </div>
        )}
      </div>
    </div>
  )
}