'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import EditStudentDrawer, { type StudentRow } from './EditStudentDrawer'

const glassSelect =
  'w-full text-sm px-3 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition appearance-none pr-8 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'

const ChevronDown = () => (
  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

function getInitials(fullName: string) {
  return fullName.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

export default function StudentTable() {
  const supabase = createClient()
  const [editingStudent, setEditingStudent] = useState<StudentRow | null>(null)

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterRegId, setFilterRegId] = useState('')
  const [filterGroupId, setFilterGroupId] = useState('')
  const [filterSectionId, setFilterSectionId] = useState('')

  // ── Lookup queries ────────────────────────────────────────────────────────
  const { data: regulations = [] } = useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regulations').select('id, name').order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
  const { data: filterGroups = [] } = useQuery({
    queryKey: ['groups', filterRegId],
    enabled: !!filterRegId,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').eq('regulation_id', filterRegId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
  const { data: filterSections = [] } = useQuery({
    queryKey: ['sections', filterGroupId],
    enabled: !!filterGroupId,
    queryFn: async () => {
      const { data, error } = await supabase.from('sections').select('id, name').eq('group_id', filterGroupId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  // ── Students query — applies filters ─────────────────────────────────────
  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students', filterRegId, filterGroupId, filterSectionId],
    queryFn: async () => {
      let query = supabase
        .from('students')
        .select('id, user_id, roll_no, full_name, phone, parent_name, parent_mobile, created_at, regulation_id, group_id, section_id')
        .order('created_at', { ascending: false })

      if (filterSectionId) query = query.eq('section_id', filterSectionId)
      else if (filterGroupId) query = query.eq('group_id', filterGroupId)
      else if (filterRegId) query = query.eq('regulation_id', filterRegId)

      const { data: studentRows, error: sErr } = await query
      if (sErr) throw sErr
      if (!studentRows || studentRows.length === 0) return []

      const [{ data: regs }, { data: grps }, { data: secs }] = await Promise.all([
        supabase.from('regulations').select('id, name'),
        supabase.from('groups').select('id, name'),
        supabase.from('sections').select('id, name'),
      ])

      const regMap = Object.fromEntries((regs || []).map((r) => [r.id, r.name]))
      const grpMap = Object.fromEntries((grps || []).map((g) => [g.id, g.name]))
      const secMap = Object.fromEntries((secs || []).map((s) => [s.id, s.name]))

      return studentRows.map((s) => ({
        ...s,
        regulation_name: regMap[s.regulation_id] || '—',
        group_name: grpMap[s.group_id] || '—',
        section_name: secMap[s.section_id] || '—',
      }))
    },
  })

  // ── Clear filters ─────────────────────────────────────────────────────────
  const hasFilter = !!(filterRegId || filterGroupId || filterSectionId)
  function clearFilters() { setFilterRegId(''); setFilterGroupId(''); setFilterSectionId('') }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 text-red-700 rounded-2xl border border-red-200 text-sm">
        <p className="font-bold mb-1">Failed to load students</p>
        <p className="text-xs opacity-80">{(error as Error).message}</p>
      </div>
    )
  }

  return (
    <>
      <EditStudentDrawer student={editingStudent} onClose={() => setEditingStudent(null)} />

      {/* ── Filter Bar ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500">Regulation</label>
            <div className="relative">
              <select value={filterRegId} onChange={(e) => { setFilterRegId(e.target.value); setFilterGroupId(''); setFilterSectionId('') }} className={glassSelect}>
                <option value="">All Regulations</option>
                {regulations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500">Group / Batch</label>
            <div className="relative">
              <select value={filterGroupId} onChange={(e) => { setFilterGroupId(e.target.value); setFilterSectionId('') }} disabled={!filterRegId} className={glassSelect}>
                <option value="">{filterRegId ? 'All Groups' : 'Select Regulation first'}</option>
                {filterGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          <div className="flex flex-col gap-1 min-w-[160px]">
            <label className="text-xs font-semibold text-slate-500">Section</label>
            <div className="relative">
              <select value={filterSectionId} onChange={(e) => setFilterSectionId(e.target.value)} disabled={!filterGroupId} className={glassSelect}>
                <option value="">{filterGroupId ? 'All Sections' : 'Select Group first'}</option>
                {filterSections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown />
            </div>
          </div>
          {hasFilter && (
            <button onClick={clearFilters} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-500 px-3 py-2.5 border border-slate-200 rounded-lg hover:border-red-200 transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filters
            </button>
          )}
          <p className="ml-auto text-xs text-slate-400 self-end pb-2.5">{students.length} student{students.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* ── Table ── */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-slate-600 font-semibold text-sm">{hasFilter ? 'No students match these filters' : 'No students enrolled yet'}</p>
          {hasFilter && <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">Clear filters</button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Section / Batch</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled On</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {students.map((student) => (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                          {getInitials(student.full_name || '')}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">{student.full_name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{student.phone || 'No phone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">{student.roll_no}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" /><span className="text-xs text-slate-600 font-medium">{(student as any).regulation_name}</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" /><span className="text-xs text-slate-500">{student.group_name}</span></div>
                        <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" /><span className="text-xs text-slate-400">{student.section_name}</span></div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-slate-700 font-medium">{student.parent_name}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{student.parent_mobile}</p>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setEditingStudent({
                          id: student.id,
                          user_id: student.user_id ?? null,
                          full_name: student.full_name,
                          roll_no: student.roll_no,
                          phone: student.phone,
                          parent_name: student.parent_name,
                          parent_mobile: student.parent_mobile,
                          regulation_id: student.regulation_id,
                          group_id: student.group_id,
                          section_id: student.section_id,
                        })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-all border border-transparent hover:border-blue-200"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
