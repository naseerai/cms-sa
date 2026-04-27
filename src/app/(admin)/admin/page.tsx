import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: noticesData } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5)
  const notices = noticesData ?? []

  const { count: studentCount } = await supabase
    .from('students')
    .select('*', { count: 'exact', head: true })

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-500 text-base">Welcome to the NexusCollege Admin Panel.</p>
      </div>

      {/* Quick-access cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {[
          { label: 'Academic Setup', desc: 'Define Regulations, Groups, and Sections.', href: '/admin/setup', color: 'from-blue-500 to-indigo-600', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
          { label: 'Student Management', desc: `${studentCount ?? 0} students enrolled.`, href: '/admin/students', color: 'from-emerald-500 to-teal-600', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
          { label: 'Attendance', desc: 'Mark daily attendance by section.', href: '/admin/attendance', color: 'from-violet-500 to-purple-600', icon: <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        ].map((card) => (
          <a key={card.href} href={card.href} className="block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
            <div className={`bg-gradient-to-r ${card.color} p-5`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">{card.icon}</div>
            </div>
            <div className="p-5">
              <h2 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{card.label}</h2>
              <p className="text-sm text-slate-500 mt-1">{card.desc}</p>
            </div>
          </a>
        ))}
      </div>

      {/* Notice Board Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Notice Board</h2>
              <p className="text-xs text-slate-400">Latest {notices.length} notice{notices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <Link href="/admin/notices" className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-800 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 rounded-lg transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Quick Post
          </Link>
        </div>

        {notices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            No notices posted yet.{' '}
            <Link href="/admin/notices" className="text-amber-600 hover:underline font-medium">Post one now →</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {notices.map((n) => (
              <div key={n.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5 line-clamp-2">{n.content}</p>
                    <p className="text-slate-400 text-xs mt-1">
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
