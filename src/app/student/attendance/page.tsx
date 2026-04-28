'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'holiday' | 'undefined'

interface AttendanceRecord {
  id: string
  date: string
  status: AttendanceStatus
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_STYLE: Record<AttendanceStatus, { badge: string; dot: string; label: string }> = {
  present:   { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Present'  },
  absent:    { badge: 'bg-red-100 text-red-600 border-red-200',             dot: 'bg-red-500',     label: 'Absent'   },
  holiday:   { badge: 'bg-amber-100 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   label: 'Holiday'  },
  undefined: { badge: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400',   label: 'Unmarked' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number): string {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10)
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', weekday: 'short' })
}

// ─── Mini components ──────────────────────────────────────────────────────────

const SpinIcon = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.undefined
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border capitalize ${s.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, gradient, ring,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ReactNode; gradient: string; ring: string
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full ${ring} opacity-20`} />
      <div className="opacity-80 mb-2">{icon}</div>
      <p className="text-3xl font-extrabold leading-none">{value}</p>
      <p className="text-sm font-semibold opacity-80 mt-1">{label}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StudentAttendancePage() {
  const supabase = createClient()

  const [startDate, setStartDate] = useState(daysAgo(30))
  const [endDate, setEndDate]     = useState(today())
  const [records, setRecords]     = useState<AttendanceRecord[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [studentId, setStudentId] = useState<string | null>(null)

  // ── Fetch student profile ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { setError('Not logged in.'); setLoading(false); return }
      const { data: s } = await supabase
        .from('students')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!s) { setError('No student profile found. Contact your administrator.'); setLoading(false); return }
      setStudentId(s.id)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch attendance records ───────────────────────────────────────────────
  const fetchRecords = useCallback(async () => {
    if (!studentId) return
    setLoading(true)
    setError('')
    try {
      const { data, error: err } = await supabase
        .from('attendance')
        .select('id, date, status')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
      if (err) throw err
      setRecords((data ?? []) as AttendanceRecord[])
    } catch (e: any) {
      setError(e.message ?? 'Failed to load attendance.')
    } finally {
      setLoading(false)
    }
  }, [studentId, startDate, endDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (studentId) fetchRecords() }, [studentId, fetchRecords])

  // ── Derived stats ─────────────────────────────────────────────────────────
  const total   = records.length
  const present = records.filter(r => r.status === 'present').length
  const absent  = records.filter(r => r.status === 'absent').length
  const holiday = records.filter(r => r.status === 'holiday').length
  const pct     = total > 0 ? Math.round((present / total) * 100) : 0

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-indigo-50/60 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-7">

        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-indigo-500 font-semibold uppercase tracking-widest mb-0.5">Student Portal</p>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance Report</h1>
            <p className="text-slate-500 text-sm mt-1">View your attendance history by date range.</p>
          </div>
          <Link
            href="/student/dashboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 hover:bg-white/90 border border-white/50 text-slate-600 text-sm font-semibold transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* ── Date range filter card ──────────────────────────────────────── */}
        <div className="bg-white/75 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today()}
                onChange={e => setEndDate(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={fetchRecords}
                disabled={loading || !studentId}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {loading ? <SpinIcon /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                {loading ? 'Loading…' : 'Apply'}
              </button>
              {/* Quick presets */}
              <button
                onClick={() => { setStartDate(daysAgo(6)); setEndDate(today()) }}
                className="px-3 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-100"
                title="Last 7 days"
              >7d</button>
              <button
                onClick={() => { setStartDate(daysAgo(29)); setEndDate(today()) }}
                className="px-3 py-2.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition border border-indigo-100"
                title="Last 30 days"
              >30d</button>
            </div>
          </div>
        </div>

        {/* ── Error state ─────────────────────────────────────────────────── */}
        {error && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-600 text-sm px-5 py-3.5 rounded-2xl">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* ── Summary cards ────────────────────────────────────────────────── */}
        {!loading && !error && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Days"
              value={total}
              sub="In selected range"
              gradient="bg-gradient-to-br from-slate-600 to-slate-800"
              ring="bg-white"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatCard
              label="Present"
              value={present}
              gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
              ring="bg-emerald-300"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Absent"
              value={absent}
              gradient="bg-gradient-to-br from-red-500 to-red-700"
              ring="bg-red-300"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatCard
              label="Attendance %"
              value={`${pct}%`}
              sub={total > 0 ? `${present} of ${total} days` : 'No records'}
              gradient={pct >= 75 ? 'bg-gradient-to-br from-indigo-500 to-violet-600' : 'bg-gradient-to-br from-orange-500 to-red-600'}
              ring={pct >= 75 ? 'bg-indigo-300' : 'bg-orange-300'}
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                </svg>
              }
            />
          </div>
        )}

        {/* Attendance percentage warning */}
        {!loading && !error && total > 0 && pct < 75 && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 text-orange-700 text-sm px-5 py-4 rounded-2xl">
            <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-bold">Attendance Below 75%</p>
              <p className="text-orange-600 text-xs mt-0.5">
                Your attendance is currently <strong>{pct}%</strong> for this period.
                Minimum required is <strong>75%</strong>. Please regularise your attendance.
              </p>
            </div>
          </div>
        )}

        {/* ── Detailed Records Table ────────────────────────────────────────── */}
        <div className="bg-white/75 backdrop-blur-md rounded-2xl border border-white/60 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h2 className="font-bold text-slate-700 text-sm">Attendance Detail</h2>
            </div>
            <span className="text-xs text-slate-400 font-semibold">
              {startDate} → {endDate}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
              <SpinIcon /> <span className="text-sm">Loading attendance records…</span>
            </div>
          ) : records.length === 0 && !error ? (
            <div className="text-center py-16">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-slate-500 font-semibold text-sm">No records in this date range</p>
              <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                Try adjusting the date range or contact your administrator if this seems incorrect.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/60 border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Day</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {records.map((r, i) => {
                    const d = new Date(r.date)
                    const day = d.toLocaleDateString('en-IN', { weekday: 'long' })
                    const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                    const isWeekend = d.getDay() === 0 || d.getDay() === 6
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-white/60 transition-colors ${
                          r.status === 'present' ? 'bg-emerald-50/10' :
                          r.status === 'absent'  ? 'bg-red-50/20'     : ''
                        }`}
                      >
                        <td className="px-6 py-3.5 text-xs text-slate-300 font-mono">
                          {String(i + 1).padStart(2, '0')}
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-700">{dateStr}</td>
                        <td className="px-4 py-3.5 text-slate-500 text-xs">
                          <span className={isWeekend ? 'text-orange-500 font-semibold' : ''}>{day}</span>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Holiday legend */}
        {!loading && holiday > 0 && (
          <p className="text-xs text-slate-400 text-center">
            ☀ {holiday} holiday{holiday !== 1 ? 's' : ''} in this range are excluded from the attendance percentage calculation.
          </p>
        )}

      </div>
    </div>
  )
}
