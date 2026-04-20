'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'

async function fetchStudentsWithNames(supabase: ReturnType<typeof createClient>) {
  // Step 1: Fetch students with columns matching the actual DB schema
  const { data: students, error: studentsError } = await supabase
    .from('students')
    .select('id, roll_no, full_name, phone, parent_name, parent_mobile, created_at, regulation_id, group_id, section_id')
    .order('created_at', { ascending: false })

  if (studentsError) throw studentsError
  if (!students || students.length === 0) return []

  // Step 2: Fetch lookup tables in parallel
  const [{ data: regulations }, { data: groups }, { data: sections }] = await Promise.all([
    supabase.from('regulations').select('id, name'),
    supabase.from('groups').select('id, name'),
    supabase.from('sections').select('id, name'),
  ])

  // Step 3: Build lookup maps
  const regulationMap = Object.fromEntries((regulations || []).map((r) => [r.id, r.name]))
  const groupMap = Object.fromEntries((groups || []).map((g) => [g.id, g.name]))
  const sectionMap = Object.fromEntries((sections || []).map((s) => [s.id, s.name]))

  // Step 4: Enrich student rows
  return students.map((s) => ({
    ...s,
    regulation_name: regulationMap[(s as any).regulation_id] || '—',
    group_name: groupMap[s.group_id] || '—',
    section_name: sectionMap[s.section_id] || '—',
  }))
}

function getInitials(fullName: string) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function StudentTable() {
  const supabase = createClient()

  const { data: students = [], isLoading, error } = useQuery({
    queryKey: ['students'],
    queryFn: () => fetchStudentsWithNames(supabase),
  })

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

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-700">No Students Enrolled</h3>
        <p className="text-slate-500 text-sm mt-1">Use the &quot;Onboard Student&quot; button above to register your first student.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table header summary */}
      <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <p className="text-sm font-semibold text-slate-700">
          {students.length} student{students.length !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Section / Batch</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Parent</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled On</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((student) => (
              <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
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
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-md">
                    {student.roll_no}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span className="text-xs text-slate-600 font-medium">{(student as any).regulation_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                      <span className="text-xs text-slate-500">{student.group_name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                      <span className="text-xs text-slate-400">{student.section_name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <p className="text-sm text-slate-700 font-medium">{student.parent_name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{student.parent_mobile}</p>
                </td>
                <td className="px-5 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                  {new Date(student.created_at).toLocaleDateString('en-US', {
                    year: 'numeric', month: 'short', day: 'numeric',
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
