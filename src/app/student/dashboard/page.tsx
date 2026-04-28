import { redirect } from 'next/navigation'
import { createClient as createServerClient } from '@/utils/supabase/server'
import {
  GraduationCap, BookOpen, Users, LayoutGrid,
  CalendarCheck, CalendarX, CalendarDays, CheckCircle2,
  Bell, LogOut, UserCircle, Hash, Phone, User2,
} from 'lucide-react'
import { AttendanceRing, NoticeBoard } from './_components/DashboardWidgets'

// ── Types ──────────────────────────────────────────────────────────────────────
interface AttendanceRecord { id: string; date: string; status: 'present' | 'absent' | 'holiday' | 'undefined' }
interface Notice           { id: string; title: string; content: string; created_at: string }

// ── Tiny reusable server components ───────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white/75 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="text-indigo-500">{icon}</div>
      <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{label}</h2>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    present:   'bg-emerald-100 text-emerald-700 border-emerald-200',
    absent:    'bg-red-100 text-red-600 border-red-200',
    holiday:   'bg-amber-100 text-amber-700 border-amber-200',
    undefined: 'bg-slate-100 text-slate-500 border-slate-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold capitalize border ${map[status] ?? map.undefined}`}>
      {status}
    </span>
  )
}

// ── Sign-out server action ─────────────────────────────────────────────────────
async function doSignOut() {
  'use server'
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

function SignOutButton() {
  return (
    <form action={doSignOut}>
      <button
        type="submit"
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/50 text-slate-600 hover:text-red-500 text-sm font-semibold transition-all shadow-sm"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </form>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────────

export default async function StudentDashboard() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Parallel data fetch ────────────────────────────────────────────────────
  // Use wildcard + named joins so nested relation names resolve correctly
const [studentRes, noticesRes] = await Promise.all([
  supabase
    .from('students')
    .select(`
      *,
      regulation:regulations!students_year_id_fkey(name),
      group:groups!students_group_id_fkey(name),
      section:sections!students_section_id_fkey(id,name)
    `)
    .eq('user_id', user.id)
    .maybeSingle(),

  supabase
    .from('notices')
    .select('id, title, content, created_at')
    .order('created_at', { ascending: false })
    .limit(5),
])

  const student = studentRes.data
  console.log("SECTION ID:", student.section_id)
console.log("SECTION DATA:", student.section)
console.log("FULL:", JSON.stringify(student, null, 2))
  const notices = (noticesRes.data ?? []) as Notice[]

  // ── Defensive: Account Setup screen ───────────────────────────────────────
  if (!student) {
    const errCode = studentRes.error?.code
    const isRls   = errCode === 'PGRST301'

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex items-center justify-center p-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Hero Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                <UserCircle className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center">
                <span className="text-slate-900 font-black text-sm">!</span>
              </div>
            </div>
          </div>

          {/* Main Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl text-center space-y-3">
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Student Portal</p>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {isRls ? 'Permission Error' : 'Account Setup Needed'}
            </h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mx-auto">
              {isRls
                ? 'Your account does not have permission to access student records. Contact your administrator to fix the RLS policy on the students table.'
                : 'Your student profile has not been linked to this login yet. Please share your Auth ID with your administrator to complete setup.'}
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-indigo-500/10 border border-indigo-400/20 rounded-2xl p-5 space-y-3">
            <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest">
              Your Auth ID (share with admin)
            </p>
            <code className="block text-indigo-200 text-xs font-mono break-all bg-slate-900/60 rounded-xl px-4 py-3 border border-indigo-400/10">
              {user.id}
            </code>
            {!isRls && (
              <>
                <p className="text-indigo-300 text-xs font-bold uppercase tracking-widest mt-1">
                  Admin SQL Fix
                </p>
                <pre className="text-indigo-200 text-xs font-mono bg-slate-900/60 rounded-xl px-4 py-3 border border-indigo-400/10 whitespace-pre-wrap">{`UPDATE public.students\nSET user_id = '${user.id}'\nWHERE roll_no = 'YOUR_ROLL_NO_HERE';`}</pre>
              </>
            )}
          </div>

          {/* Sign Out */}
          <div className="flex justify-center">
            <SignOutButton />
          </div>

          {/* Notice Board (still visible without profile) */}
          {notices.length > 0 && (
            <div className="space-y-3 bg-white/5 border border-white/10 rounded-2xl p-5">
              <SectionHeading icon={<Bell className="w-4 h-4" />} label="Notice Board" />
              <NoticeBoard notices={notices} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Attendance ─────────────────────────────────────────────────────────────
  const { data: allAtt } = await supabase
    .from('attendance')
    .select('id, date, status')
    .eq('student_id', student.id)
    .order('date', { ascending: false })

  const att     = (allAtt ?? []) as AttendanceRecord[]
  const total   = att.length
  const present = att.filter(r => r.status === 'present').length
  const absent  = att.filter(r => r.status === 'absent').length
  const holiday = att.filter(r => r.status === 'holiday').length
  // Guard: never divide by zero — pct is 0 when no records exist
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0
  const recent  = att.slice(0, 10)

  // ── Derived: handle both nested objects and flat fallbacks ────────────────
  const regulation = (student.regulation as any)?.name ?? '—'
const group      = (student.group as any)?.name ?? '—'
const section    = (student.section as any)?.name ?? '—'
  const rawName    = student.full_name ?? ''
  const initials   = rawName.split(' ').filter(Boolean).slice(0, 2)
    .map((w: string) => w[0]?.toUpperCase() ?? '').join('')

  const placements = [
    { label: 'Regulation',   value: regulation, icon: <BookOpen    className="w-5 h-5" />, from: 'from-blue-500',   to: 'to-blue-600',   shadow: 'shadow-blue-500/20'   },
    { label: 'Group / Batch',value: group,       icon: <Users       className="w-5 h-5" />, from: 'from-indigo-500', to: 'to-indigo-600', shadow: 'shadow-indigo-500/20' },
    { label: 'Section',      value: section,     icon: <LayoutGrid  className="w-5 h-5" />, from: 'from-violet-500', to: 'to-violet-600', shadow: 'shadow-violet-500/20' },
  ]

  const statPills = [
    { label: 'Total Classes', value: total,   icon: <CalendarDays  className="w-4 h-4" />, cls: 'bg-slate-100 text-slate-700'   },
    { label: 'Present',       value: present, icon: <CalendarCheck className="w-4 h-4" />, cls: 'bg-emerald-100 text-emerald-700' },
    { label: 'Absent',        value: absent,  icon: <CalendarX     className="w-4 h-4" />, cls: 'bg-red-100 text-red-600'        },
    { label: 'Holiday',       value: holiday, icon: <CheckCircle2  className="w-4 h-4" />, cls: 'bg-amber-100 text-amber-700'    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/60 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-7">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-extrabold shadow-lg shadow-indigo-500/25 shrink-0">
              {initials || '?'}
            </div>
            <div>
              <p className="text-xs text-indigo-500 font-semibold uppercase tracking-widest mb-0.5">Student Portal</p>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Welcome back, {rawName.split(' ')[0] || 'Student'}!
              </h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
                  <Hash className="w-3 h-3" /> {student.roll_no}
                </span>
                <span className="text-slate-300 text-xs">•</span>
                <span className="text-xs text-slate-500 font-medium">{regulation} › {group} › {section}</span>
              </div>
            </div>
          </div>
          <SignOutButton />
        </div>

        {/* ── Main Grid ────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left col */}
          <div className="lg:col-span-2 space-y-6">

            {/* Attendance Health */}
            <GlassCard className="p-6">
              <SectionHeading icon={<CalendarCheck className="w-4 h-4" />} label="Attendance Health" />
              {total === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <CalendarDays className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">No attendance records yet.</p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-8">
                  <AttendanceRing pct={pct} />
                  <div className="flex-1 w-full grid grid-cols-2 gap-3">
                    {statPills.map(({ label, value, icon, cls }) => (
                      <div key={label} className={`flex items-center gap-3 rounded-xl px-4 py-3.5 ${cls}`}>
                        <div className="opacity-70">{icon}</div>
                        <div>
                          <p className="text-xl font-extrabold leading-none">{value}</p>
                          <p className="text-[11px] font-semibold opacity-70 mt-0.5">{label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Academic Placement */}
            <div>
              <SectionHeading icon={<GraduationCap className="w-4 h-4" />} label="Academic Placement" />
              <div className="grid grid-cols-3 gap-4">
                {placements.map(({ label, value, icon, from, to, shadow }) => (
                  <div key={label} className={`bg-gradient-to-br ${from} ${to} rounded-2xl p-5 text-white shadow-md ${shadow}`}>
                    <div className="opacity-70 mb-2">{icon}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-1">{label}</p>
                    <p className="text-base font-extrabold leading-tight">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance History */}
            {recent.length > 0 && (
              <GlassCard className="overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                    <CalendarDays className="w-4 h-4 text-indigo-400" />
                    Attendance History
                  </div>
                  <span className="text-xs text-slate-400">Last {recent.length} records</span>
                </div>
                <div className="divide-y divide-slate-50/80">
                  {recent.map((r, i) => (
                    <div key={r.id} className="flex items-center gap-4 px-6 py-3 hover:bg-white/50 transition-colors">
                      <span className="text-xs text-slate-300 font-mono w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                      <span className="flex-1 text-sm font-semibold text-slate-700">
                        {new Date(r.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* Right col */}
          <div className="space-y-6">

            {/* Profile Card */}
            <GlassCard className="p-6">
              <SectionHeading icon={<UserCircle className="w-4 h-4" />} label="My Profile" />
              <div className="space-y-3">
                {[
                  { icon: <User2 className="w-4 h-4" />, label: 'Full Name',     val: student.full_name      ?? '—' },
                  { icon: <Hash  className="w-4 h-4" />, label: 'Roll No',       val: student.roll_no        ?? '—' },
                  { icon: <Phone className="w-4 h-4" />, label: 'Phone',         val: student.phone          || 'Not provided' },
                  { icon: <User2 className="w-4 h-4" />, label: 'Parent',        val: student.parent_name    ?? '—' },
                  { icon: <Phone className="w-4 h-4" />, label: 'Parent Mobile', val: student.parent_mobile  ?? '—' },
                ].map(({ icon, label, val }) => (
                  <div key={label} className="flex items-start gap-3 p-3 bg-slate-50/70 rounded-xl">
                    <div className="text-indigo-400 mt-0.5 shrink-0">{icon}</div>
                    <div className="min-w-0">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
                      <p className="text-sm font-semibold text-slate-700 truncate">{val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Notice Board */}
            {notices.length > 0 && (
              <div id="notices">
                <GlassCard className="p-6">
                  <SectionHeading icon={<Bell className="w-4 h-4" />} label="Notice Board" />
                  <NoticeBoard notices={notices} />
                </GlassCard>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
