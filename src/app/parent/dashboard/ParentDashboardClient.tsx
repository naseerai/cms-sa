'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Student {
  id: string
  full_name: string
  roll_no: string
  regulation_name: string
  group_name: string
  section_name: string
}

interface AttendanceSummary {
  present: number
  absent: number
  holiday: number
  total: number
  pct: number | null
}

interface Notice {
  id: string
  title: string
  content: string
  created_at: string
}

const SpinIcon = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function ParentDashboardClient({ initialNotices }: { initialNotices: Notice[] }) {
  const supabase = createClient()
  const [mobile, setMobile] = useState('')
  const [student, setStudent] = useState<Student | null>(null)
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSearch() {
    if (!mobile.trim()) return
    setError('')
    setStudent(null)
    setAttendance(null)
    startTransition(async () => {
      // Find student by parent_mobile
      const { data: students, error: sErr } = await supabase
        .from('students')
        .select(`
          id, full_name, roll_no,
          regulations:regulation_id(name),
          groups:group_id(name),
          sections:section_id(name)
        `)
        .eq('parent_mobile', mobile.trim())
        .limit(1)

      if (sErr || !students || students.length === 0) {
        setError('No student found with this parent mobile number.')
        return
      }

      const s = students[0]
      const foundStudent: Student = {
        id: s.id,
        full_name: s.full_name,
        roll_no: s.roll_no,
        regulation_name: (s.regulations as any)?.name ?? '—',
        group_name: (s.groups as any)?.name ?? '—',
        section_name: (s.sections as any)?.name ?? '—',
      }
      setStudent(foundStudent)

      // Fetch attendance summary
      const { data: records } = await supabase
        .from('attendance')
        .select('status')
        .eq('student_id', s.id)

      if (records) {
        const present = records.filter((r) => r.status === 'present').length
        const absent = records.filter((r) => r.status === 'absent').length
        const holiday = records.filter((r) => r.status === 'holiday').length
        const working = present + absent
        setAttendance({ present, absent, holiday, total: working, pct: working > 0 ? Math.round((present / working) * 100) : null })
      }
    })
  }

  const pctColor = attendance?.pct == null ? 'text-slate-400' : attendance.pct >= 75 ? 'text-emerald-600' : attendance.pct >= 60 ? 'text-amber-600' : 'text-red-600'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-purple-50/40 to-pink-50/30">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Parent Portal</h1>
          <p className="text-slate-500 text-sm mt-1">Enter your registered mobile number to view your child's progress.</p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">Parent Mobile Number</label>
          <div className="flex gap-3">
            <input
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. +92 300 0000000"
              className="flex-1 text-sm px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-400 outline-none transition"
            />
            <button
              onClick={handleSearch}
              disabled={isPending || !mobile.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-500/30 transition-all disabled:opacity-60"
            >
              {isPending ? <SpinIcon /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
              Find Student
            </button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Student info */}
        {student && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-lg shadow-purple-500/20">
              <p className="text-purple-200 text-xs font-semibold mb-1">Student Profile</p>
              <h2 className="text-2xl font-extrabold">{student.full_name}</h2>
              <p className="text-purple-200 text-sm mt-1 font-mono">Roll No: {student.roll_no}</p>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {[{ label: 'Regulation', val: student.regulation_name }, { label: 'Group', val: student.group_name }, { label: 'Section', val: student.section_name }].map((item) => (
                  <div key={item.label} className="bg-white/15 rounded-xl p-3 text-center">
                    <p className="text-purple-200 text-xs">{item.label}</p>
                    <p className="text-white font-bold text-sm mt-0.5">{item.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance summary */}
            {attendance && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Attendance Summary
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-emerald-50 rounded-xl p-4 text-center"><p className="text-2xl font-extrabold text-emerald-600">{attendance.present}</p><p className="text-xs text-emerald-600 font-semibold mt-1">Present</p></div>
                  <div className="bg-red-50 rounded-xl p-4 text-center"><p className="text-2xl font-extrabold text-red-500">{attendance.absent}</p><p className="text-xs text-red-500 font-semibold mt-1">Absent</p></div>
                  <div className="bg-orange-50 rounded-xl p-4 text-center"><p className="text-2xl font-extrabold text-orange-500">{attendance.holiday}</p><p className="text-xs text-orange-500 font-semibold mt-1">Holiday</p></div>
                  <div className="bg-slate-50 rounded-xl p-4 text-center">
                    <p className={`text-2xl font-extrabold ${pctColor}`}>{attendance.pct !== null ? `${attendance.pct}%` : '—'}</p>
                    <p className="text-xs text-slate-500 font-semibold mt-1">Attendance %</p>
                  </div>
                </div>
              </div>
            )}

            {/* Notices */}
            {initialNotices.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Latest Notices
                </h3>
                <div className="space-y-3">
                  {initialNotices.map((n) => (
                    <div key={n.id} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{n.title}</p>
                        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{n.content}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
