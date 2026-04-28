'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { Download } from 'lucide-react'

const glassSelect =
  'w-full text-sm px-3.5 py-2.5 border border-white/40 rounded-xl bg-white/50 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition appearance-none pr-9 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'

const ChevronDown = () => (
  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const SpinIcon = () => (
  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

interface AttendanceRow {
  student_id: string
  status: 'present' | 'absent' | 'holiday' | 'undefined'
}

interface Student {
  id: string
  full_name: string
  roll_no: string
}

type TableRow = Student & {
  present: number
  absent: number
  holiday: number
  total: number   // total classes (present + absent, excluding holiday)
  pct: number | null
}

export default function AttendanceReport() {
  const supabase = createClient()

  const [regulationId, setRegulationId] = useState('')
  const [groupId, setGroupId]           = useState('')
  const [sectionId, setSectionId]       = useState('')
  const [startDate, setStartDate]       = useState('')
  const [endDate, setEndDate]           = useState('')
  const [searched, setSearched]         = useState(false)

  // ── Cascade queries ──────────────────────────────────────────────────────
  const { data: regulations = [] } = useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regulations').select('id, name').order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['groups', regulationId],
    enabled: !!regulationId,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').eq('regulation_id', regulationId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.from('sections').select('id, name').eq('group_id', groupId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  // ── Report query ─────────────────────────────────────────────────────────
  const canSearch = !!sectionId && !!startDate && !!endDate
  const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ['attendance-report', sectionId, startDate, endDate],
    enabled: false,
    queryFn: async () => {
      const [{ data: students, error: sErr }, { data: records, error: rErr }] = await Promise.all([
        supabase.from('students').select('id, full_name, roll_no').eq('section_id', sectionId).order('roll_no'),
        supabase.from('attendance').select('student_id, status').eq('section_id', sectionId).gte('date', startDate).lte('date', endDate),
      ])
      if (sErr) throw sErr
      if (rErr) throw rErr
      return { students: students as Student[], records: records as AttendanceRow[] }
    },
  })

  function handleSearch() {
    setSearched(true)
    refetch()
  }

  // ── Compute per-student stats ────────────────────────────────────────────
  const tableRows = useMemo<TableRow[]>(() => {
    if (!reportData) return []
    const { students, records } = reportData
    return students.map((s) => {
      const sRecords = records.filter((r) => r.student_id === s.id)
      const present  = sRecords.filter((r) => r.status === 'present').length
      const absent   = sRecords.filter((r) => r.status === 'absent').length
      const holiday  = sRecords.filter((r) => r.status === 'holiday').length
      // Total classes = working days (present + absent), holidays excluded
      const total    = present + absent
      // Guard against divide-by-zero
      const pct      = total > 0 ? Math.round((present / total) * 100) : null
      return { ...s, present, absent, holiday, total, pct }
    })
  }, [reportData])

  const sectionName = sections.find((s) => s.id === sectionId)?.name ?? ''

  // ── CSV Download ─────────────────────────────────────────────────────────
  function downloadCSV() {
    if (!tableRows.length) return
    const headers = ['Roll No', 'Student Name', 'Total Classes', 'Days Present', 'Days Absent', 'Attendance %']
    const rows = tableRows.map((r) => [
      r.roll_no,
      r.full_name,
      r.total,
      r.present,
      r.absent,
      r.pct !== null ? `${r.pct}%` : '—',
    ])
    const csv = [headers, ...rows].map((row) => row.map(String).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `attendance-${sectionName}-${startDate}-to-${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* ── Filter Card ── */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/60 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Report Filters</h2>
            <p className="text-xs text-slate-400 mt-0.5">Select Regulation → Group → Section and a date range</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Regulation */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Regulation</label>
            <div className="relative">
              <select value={regulationId} onChange={(e) => { setRegulationId(e.target.value); setGroupId(''); setSectionId('') }} className={glassSelect}>
                <option value="">Select regulation…</option>
                {regulations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          {/* Group */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Group</label>
            <div className="relative">
              <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setSectionId('') }} disabled={!regulationId} className={glassSelect}>
                <option value="">Select group…</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          {/* Section */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">Section</label>
            <div className="relative">
              <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!groupId} className={glassSelect}>
                <option value="">Select section…</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          {/* Start Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">From Date</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={glassSelect + ' pr-3.5'} />
          </div>
          {/* End Date */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-600">To Date</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={glassSelect + ' pr-3.5'} />
          </div>
          {/* Generate button */}
          <div className="flex flex-col gap-1.5 justify-end">
            <button
              type="button"
              onClick={handleSearch}
              disabled={!canSearch || reportLoading}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {reportLoading ? <><SpinIcon /> Generating…</> : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Results Table ── */}
      {searched && !reportLoading && reportData && (
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/60 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-800 text-sm">{sectionName} — Attendance Summary</h2>
              <p className="text-xs text-slate-400 mt-0.5">{startDate} to {endDate} · {tableRows.length} students</p>
            </div>
            {/* Download CSV */}
            <button
              onClick={downloadCSV}
              disabled={tableRows.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
          {tableRows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">No students found for this section.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/60 bg-slate-50/50">
                    <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Roll No</th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total Classes</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-emerald-600 uppercase tracking-wider">Days Present</th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-red-500 uppercase tracking-wider">Days Absent</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-indigo-600 uppercase tracking-wider">Attendance %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/50">
                  {tableRows.map((row, idx) => {
                    const pctColor =
                      row.pct === null ? 'text-slate-400'
                      : row.pct >= 75  ? 'text-emerald-600'
                      : row.pct >= 60  ? 'text-amber-600'
                      : 'text-red-600'
                    const pctBg =
                      row.pct === null ? ''
                      : row.pct >= 75  ? 'bg-emerald-50'
                      : row.pct >= 60  ? 'bg-amber-50'
                      : 'bg-red-50'
                    return (
                      <tr key={row.id} className="hover:bg-white/60 transition-colors">
                        <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">{row.roll_no}</span>
                        </td>
                        <td className="px-4 py-3.5 font-semibold text-slate-800">{row.full_name}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-600">{row.total}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{row.present}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-red-500">{row.absent}</td>
                        <td className="px-5 py-3.5 text-center">
                          {row.pct === null ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            <span className={`inline-flex items-center justify-center min-w-[3.5rem] text-sm font-extrabold px-2 py-0.5 rounded-lg ${pctColor} ${pctBg}`}>
                              {row.pct}%
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Empty prompt */}
      {!searched && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl shadow-slate-200/40 p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-slate-600 font-bold text-base">No report generated yet</p>
          <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Select a <strong className="text-slate-600">Regulation → Group → Section</strong> and a date range, then click <strong className="text-slate-600">Generate Report</strong>.
          </p>
        </div>
      )}
    </div>
  )
}
