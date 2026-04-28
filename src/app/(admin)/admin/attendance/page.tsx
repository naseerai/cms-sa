import Link from 'next/link'
import AttendanceManager from './_components/AttendanceManager'
import { BarChart2 } from 'lucide-react'

export const metadata = {
  title: 'Daily Attendance — NexusCollege',
  description: 'Mark and save daily student attendance by Regulation, Group, and Section.',
}

export default function AttendancePage() {
  return (
    /* Gradient backdrop so glassmorphism cards have depth */
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/60 to-indigo-100/40">
      <div className="page-container">

        {/* ── Page Header ── */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Daily Module</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Attendance Management
            </h1>
            <p className="mt-1.5 text-slate-500 text-sm max-w-2xl">
              Select a{' '}
              <strong className="text-slate-700">Regulation → Group → Section</strong> to load
              students, mark their status, and save — all in one flow.
            </p>
          </div>

          {/* Right side: Reports button + Today badge */}
          <div className="shrink-0 flex items-center gap-3 flex-wrap justify-end">
            {/* ── View Detailed Reports button ── */}
            <Link
              href="/admin/reports/attendance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 hover:bg-white/90 border-2 border-indigo-400 text-indigo-700 hover:text-indigo-900 text-sm font-bold shadow-sm transition-all duration-200 hover:shadow-md hover:border-indigo-500"
            >
              <BarChart2 className="w-4 h-4" />
              View Detailed Reports
            </Link>

            {/* Today badge */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white/70 backdrop-blur-sm border border-white/60 rounded-xl shadow-sm text-sm font-semibold text-slate-600">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <AttendanceManager />
      </div>
    </div>
  )
}
