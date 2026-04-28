import Link from 'next/link'
import AttendanceReport from './_components/AttendanceReport'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Attendance Reports — NexusCollege',
  description: 'View attendance summaries by section and date range.',
}

export default function AttendanceReportPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-violet-50/60 to-indigo-100/40">
      <div className="page-container">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">Reports</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Attendance Reports</h1>
            <p className="mt-1.5 text-slate-500 text-sm max-w-2xl">
              Filter by <strong className="text-slate-700">Regulation → Group → Section</strong> and a date range to see each student&apos;s attendance summary.
            </p>
          </div>

          {/* Back to Marking button */}
          <div className="shrink-0">
            <Link
              href="/admin/attendance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 hover:bg-white border border-white/60 hover:border-slate-200 text-slate-700 hover:text-slate-900 text-sm font-bold shadow-sm transition-all duration-200 hover:shadow-md"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Marking
            </Link>
          </div>
        </div>
        <AttendanceReport />
      </div>
    </div>
  )
}
