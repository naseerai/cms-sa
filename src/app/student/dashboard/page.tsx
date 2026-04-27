import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

function InfoCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-slate-800 truncate">{value || '—'}</p>
      </div>
    </div>
  )
}

interface Notice {
  id: string
  title: string
  content: string
  created_at: string
}

export default async function StudentDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch student record with related names
  const { data: student, error } = await supabase
    .from('students')
    .select(`
      id,
      full_name,
      roll_no,
      phone,
      parent_name,
      parent_mobile,
      current_year_level,
      created_at,
      regulations:regulation_id ( name ),
      groups:group_id ( name ),
      sections:section_id ( name )
    `)
    .eq('user_id', user.id)
    .single()

  // Fetch latest notices regardless of student profile status
  const { data: notices = [] } = await supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error || !student) {
    const isRlsError = error?.code === 'PGRST301' || error?.message?.toLowerCase().includes('permission')
    return (
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-6">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl p-6 text-sm">
          <p className="font-bold mb-1">Profile not linked</p>
          {isRlsError ? (
            <p>Your account does not have permission to read student records. Please ask your administrator to check the Row-Level Security policy on the <code className="bg-amber-100 px-1 rounded">students</code> table.</p>
          ) : (
            <p>Your student profile has not been linked to this account yet. Please contact your administrator and ask them to set your <code className="bg-amber-100 px-1 rounded">user_id</code> in the students table (your UID is <code className="bg-amber-100 px-1 rounded">{user.id}</code>).</p>
          )}
        </div>

        {/* Still show notices even if profile not linked */}
        {(notices as Notice[]).length > 0 && <NoticesFeed notices={notices as Notice[]} />}
      </div>
    )
  }

  const regulationName = (student.regulations as any)?.name ?? '—'
  const groupName = (student.groups as any)?.name ?? '—'
  const sectionName = (student.sections as any)?.name ?? '—'

  const initials = student.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '')
    .join('')

  const enrolledDate = new Date(student.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 rounded-3xl p-8 mb-8 shadow-lg shadow-indigo-500/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white rounded-full" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white rounded-full" />
        </div>
        <div className="relative flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-2xl font-bold shadow-xl shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1">Welcome back</p>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">{student.full_name}</h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
                Roll No: {student.roll_no}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                Year Level: {student.current_year_level ?? 1}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                Enrolled {enrolledDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Academic Placement */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Academic Placement</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-md shadow-blue-500/20">
            <p className="text-blue-200 text-xs font-semibold uppercase tracking-wider mb-1">Regulation</p>
            <p className="text-xl font-bold">{regulationName}</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 text-white shadow-md shadow-indigo-500/20">
            <p className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Batch / Group</p>
            <p className="text-xl font-bold">{groupName}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-5 text-white shadow-md shadow-violet-500/20">
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-wider mb-1">Section</p>
            <p className="text-xl font-bold">{sectionName}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-md shadow-emerald-500/20">
            <p className="text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-1">Year Level</p>
            <p className="text-xl font-bold">Year {student.current_year_level ?? 1}</p>
          </div>
        </div>
      </div>

      {/* Personal Details */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Personal Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <InfoCard label="Full Name" value={student.full_name} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          } />
          <InfoCard label="Phone" value={student.phone || 'Not provided'} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          } />
          <InfoCard label="Parent / Guardian" value={student.parent_name} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          } />
          <InfoCard label="Parent Mobile" value={student.parent_mobile} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          } />
          <InfoCard label="Email" value={user.email ?? '—'} icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          } />
        </div>
      </div>

      {/* Latest Notices */}
      {(notices as Notice[]).length > 0 && <NoticesFeed notices={notices as Notice[]} />}
    </div>
  )
}

function NoticesFeed({ notices }: { notices: Notice[] }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        Latest Notices
      </h2>
      <div className="space-y-3">
        {notices.map((n) => (
          <div key={n.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 mt-2 shrink-0" />
              <div>
                <p className="font-bold text-slate-800 text-sm">{n.title}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                <p className="text-xs text-slate-400 mt-2">
                  {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
