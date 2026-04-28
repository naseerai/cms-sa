'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/hooks/useToast'
import Toaster from '@/components/ui/Toaster'

// ─── Types ────────────────────────────────────────────────────────────────────

type AttendanceStatus = 'present' | 'absent' | 'holiday' | 'undefined'

interface Student {
  id: string
  full_name: string
  roll_no: string
}

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; emoji: string; active: string; idle: string; rowBg: string; dot: string }
> = {
  present: {
    label: 'Present',
    emoji: '✓',
    active:
      'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-400/40 scale-105',
    idle: 'bg-white/60 text-slate-500 border-slate-200/80 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50/60',
    rowBg: 'bg-emerald-50/20',
    dot: 'bg-emerald-500',
  },
  absent: {
    label: 'Absent',
    emoji: '✗',
    active:
      'bg-red-500 text-white border-red-500 shadow-sm shadow-red-400/40 scale-105',
    idle: 'bg-white/60 text-slate-500 border-slate-200/80 hover:border-red-400 hover:text-red-600 hover:bg-red-50/60',
    rowBg: 'bg-red-50/30',
    dot: 'bg-red-500',
  },
  holiday: {
    label: 'Holiday',
    emoji: '☀',
    active:
      'bg-orange-500 text-white border-orange-500 shadow-sm shadow-orange-400/40 scale-105',
    idle: 'bg-white/60 text-slate-500 border-slate-200/80 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/60',
    rowBg: 'bg-orange-50/20',
    dot: 'bg-orange-500',
  },
  undefined: {
    label: 'Undefined',
    emoji: '—',
    active:
      'bg-slate-400 text-white border-slate-400 shadow-sm shadow-slate-300/40 scale-105',
    idle: 'bg-white/60 text-slate-500 border-slate-200/80 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50/60',
    rowBg: '',
    dot: 'bg-slate-400',
  },
}

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as AttendanceStatus[]

// ─── Shared Micro Components ──────────────────────────────────────────────────

const SpinIcon = ({ size = 'h-4 w-4' }: { size?: string }) => (
  <svg className={`animate-spin ${size}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const ChevronDown = () => (
  <svg
    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
    fill="none" stroke="currentColor" viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
)

const glassSelect =
  'w-full text-sm px-3.5 py-2.5 border border-white/40 rounded-xl bg-white/50 backdrop-blur-sm text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-400 outline-none transition appearance-none pr-9 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm'

function StepSelect({
  step,
  stepColor,
  label,
  children,
}: {
  step: number
  stepColor: string
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
        <span
          className={`w-4 h-4 rounded-full ${stepColor} text-white text-[9px] font-extrabold flex items-center justify-center shrink-0`}
        >
          {step}
        </span>
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  )
}

// ─── Status Toggle Row ────────────────────────────────────────────────────────

function StatusToggle({
  current,
  onChange,
}: {
  current: AttendanceStatus
  onChange: (s: AttendanceStatus) => void
}) {
  return (
    <div className="flex gap-1.5 flex-wrap justify-end">
      {ALL_STATUSES.map((s) => {
        const cfg = STATUS_CONFIG[s]
        const isActive = current === s
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            title={cfg.label}
            className={`text-[11px] font-bold px-3 py-1.5 rounded-lg border transition-all duration-150 ${
              isActive ? cfg.active : cfg.idle
            }`}
          >
            <span className="hidden sm:inline">{cfg.label}</span>
            <span className="sm:hidden">{cfg.emoji}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AttendanceManager() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { toast, toasts, dismiss } = useToast()

  // ── Filter state ──────────────────────────────────────────────────────────
  const [regulationId, setRegulationId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  )
  // loadTriggered: students only load when the button is clicked
  const [loadTriggered, setLoadTriggered] = useState(false)

  // ── Attendance map: student_id → status ──────────────────────────────────
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({})
  const [isDirty, setIsDirty] = useState(false)

  // ─── Cascade reset helpers ────────────────────────────────────────────────

  function handleRegulationChange(id: string) {
    setRegulationId(id)
    setGroupId('')
    setSectionId('')
    setAttendance({})
    setIsDirty(false)
    setLoadTriggered(false)
  }

  function handleGroupChange(id: string) {
    setGroupId(id)
    setSectionId('')
    setAttendance({})
    setIsDirty(false)
    setLoadTriggered(false)
  }

  function handleSectionChange(id: string) {
    setSectionId(id)
    setAttendance({})
    setIsDirty(false)
    setLoadTriggered(false)
  }

  // Date change: keep loadTriggered if a section is already selected
  // so the component auto-re-fetches existing records for the new date
  function handleDateChange(val: string) {
    setAttendanceDate(val)
    setAttendance({})
    setIsDirty(false)
    // Do NOT reset loadTriggered here — the queries will re-run automatically
    // because the queryKey changes (it includes attendanceDate)
  }

  // ─── Data Fetching ────────────────────────────────────────────────────────

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
      const { data, error } = await supabase
        .from('groups')
        .select('id, name')
        .eq('regulation_id', regulationId)
        .order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name')
        .eq('group_id', groupId)
        .order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  // students — only load when loadTriggered
  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['students-section', sectionId],
    enabled: !!sectionId && loadTriggered,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name, roll_no')
        .eq('section_id', sectionId)
        .order('roll_no')
      if (error) throw error
      return data as Student[]
    },
  })

  // fetch existing attendance records for sectionId + date
  const { data: existingRecords = [], isFetching: existingRecordsFetching } = useQuery({
    queryKey: ['attendance-existing', sectionId, attendanceDate],
    enabled: !!sectionId && loadTriggered,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('section_id', sectionId)
        .eq('date', attendanceDate)
      if (error) throw error
      return data as { student_id: string; status: AttendanceStatus }[]
    },
    // Always re-fetch when the query key changes (date switch)
    staleTime: 0,
  })

  // seed attendance map: existing DB records take priority, rest default to 'undefined'
  // Only run AFTER both students AND existing records have finished loading
  useEffect(() => {
    if (students.length === 0) return
    if (existingRecordsFetching) return // wait until records are loaded from DB
    setAttendance(() => {
      const next: Record<string, AttendanceStatus> = {}
      for (const s of students) next[s.id] = 'undefined'
      for (const r of existingRecords) next[r.student_id] = r.status
      return next
    })
  }, [students, existingRecords, existingRecordsFetching])

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const counts = { present: 0, absent: 0, holiday: 0, undefined: 0 }
    for (const v of Object.values(attendance)) counts[v]++
    return counts
  }, [attendance])

  // ── Bulk mark all ─────────────────────────────────────────────────────────

  function markAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {}
    for (const s of students) next[s.id] = status
    setAttendance(next)
    setIsDirty(true)
  }

  // ── Save mutation ─────────────────────────────────────────────────────────

  const saveAttendance = useMutation({
    mutationFn: async () => {
      if (!sectionId || students.length === 0)
        throw new Error('Please select a section before saving.')

      const records = students.map((s) => ({
        student_id: s.id,
        section_id: sectionId,
        date: attendanceDate,
        status: attendance[s.id] ?? 'undefined',
      }))

      const { error } = await supabase.from('attendance').upsert(records, {
  onConflict: 'student_id,date', // <--- Remove section_id from here
})
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({
        title: 'Attendance saved!',
        description: `${students.length} records saved for ${attendanceDate}.`,
        variant: 'success',
      })
      setIsDirty(false)
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (err: any) => {
      toast({ title: 'Failed to save', description: err.message, variant: 'error' })
    },
  })

  // ─── Derived values ───────────────────────────────────────────────────────

  const canSave = !!sectionId && students.length > 0 && Object.keys(attendance).length > 0
  const selectedRegName = regulations.find((r) => r.id === regulationId)?.name
  const selectedGroupName = groups.find((g) => g.id === groupId)?.name
  const selectedSectionName = sections.find((s) => s.id === sectionId)?.name

  const statsDisplay = [
    { key: 'present' as const,   color: 'text-emerald-600', bg: 'bg-emerald-50/70',  border: 'border-emerald-200/50' },
    { key: 'absent' as const,    color: 'text-red-600',     bg: 'bg-red-50/70',      border: 'border-red-200/50' },
    { key: 'holiday' as const,   color: 'text-orange-600',  bg: 'bg-orange-50/70',   border: 'border-orange-200/50' },
    { key: 'undefined' as const, color: 'text-slate-500',   bg: 'bg-slate-50/70',    border: 'border-slate-200/50' },
  ]

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      <div className="space-y-5">

        {/* ── Filter Card ─────────────────────────────────────────────────── */}
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-4 border-b border-white/60 bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Session Filter</h2>
              <p className="text-xs text-slate-400 mt-0.5">Select Regulation → Group → Section to load students</p>
            </div>
          </div>

          {/* Dropdowns + date */}
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* 1 Regulation */}
            <StepSelect step={1} stepColor="bg-blue-600" label="Regulation">
              <select
                value={regulationId}
                onChange={(e) => handleRegulationChange(e.target.value)}
                className={glassSelect}
              >
                <option value="">Select regulation…</option>
                {regulations.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <ChevronDown />
            </StepSelect>

            {/* 2 Group */}
            <StepSelect step={2} stepColor="bg-indigo-600" label="Group">
              <select
                value={groupId}
                onChange={(e) => handleGroupChange(e.target.value)}
                disabled={!regulationId}
                className={glassSelect}
              >
                <option value="">Select group…</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
              <ChevronDown />
            </StepSelect>

            {/* 3 Section */}
            <StepSelect step={3} stepColor="bg-violet-600" label="Section">
              <select
                value={sectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                disabled={!groupId}
                className={glassSelect}
              >
                <option value="">Select section…</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <ChevronDown />
            </StepSelect>

            {/* 4 Date */}
            <StepSelect step={4} stepColor="bg-sky-600" label="Date">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className={glassSelect + ' pr-3.5 cursor-pointer'}
              />
            </StepSelect>
          </div>

          {/* Context strip + Load button — shown once section is selected */}
          {sectionId && (
            <div className="px-6 pb-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200/50">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <p className="text-xs font-semibold text-indigo-700">
                  <span className="font-extrabold">{selectedSectionName}</span>
                  <span className="text-indigo-400 mx-1.5">·</span>
                  <span className="font-normal text-indigo-600">{selectedRegName} / {selectedGroupName}</span>
                  <span className="text-indigo-400 mx-1.5">·</span>
                  {attendanceDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLoadTriggered(true)}
                disabled={loadTriggered && studentsLoading}
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
              >
                {loadTriggered && studentsLoading ? (
                  <><SpinIcon /> Loading…</>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Load Attendance
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* ── Student Table ────────────────────────────────────────────────── */}
        {sectionId ? (
          <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">

            {/* Table toolbar */}
            <div className="px-6 py-4 border-b border-white/60 bg-gradient-to-r from-violet-500/10 via-indigo-500/5 to-transparent flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-500/30">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 text-sm">
                    {studentsLoading
                      ? 'Loading students…'
                      : `${students.length} Student${students.length !== 1 ? 's' : ''}`}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedSectionName} · {attendanceDate}</p>
                </div>
              </div>

              {/* Bulk Mark-All buttons */}
              {students.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400 font-semibold shrink-0">Mark all as:</span>
                  {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s]
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => markAll(s)}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-lg border transition-all duration-150 ${cfg.idle}`}
                      >
                        {cfg.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Stats strip */}
            {students.length > 0 && (
              <div className="grid grid-cols-4 divide-x divide-white/60 border-b border-white/60">
                {statsDisplay.map(({ key, color, bg, border }) => (
                  <div key={key} className={`px-4 py-3 flex items-center gap-2.5 ${bg} border-b ${border}`}>
                    <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[key].dot} shrink-0`} />
                    <span className={`text-xl font-extrabold ${color}`}>{stats[key]}</span>
                    <span className={`text-xs font-semibold ${color} opacity-70 hidden sm:inline`}>
                      {STATUS_CONFIG[key].label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Body: loading / empty / table */}
            {/* Records-fetching banner — shown when students loaded but existing records are still being fetched */}
            {!studentsLoading && students.length > 0 && existingRecordsFetching && (
              <div className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-50/80 border-b border-indigo-100/80 text-xs text-indigo-600 font-semibold">
                <SpinIcon size="h-3.5 w-3.5" />
                Fetching saved attendance records from the database…
              </div>
            )}
            {studentsLoading ? (
              <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
                <SpinIcon size="h-5 w-5" /> <span className="text-sm">Loading students…</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-slate-500 font-semibold text-sm">No students in this section</p>
                <p className="text-slate-400 text-xs mt-1.5 max-w-xs mx-auto">
                  Enroll students via Student Management first.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/60 bg-slate-50/50">
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-12">#</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Roll No</th>
                      <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Student Name</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/50">
                    {students.map((student, idx) => {
                      const status = attendance[student.id] ?? 'undefined'
                      const rowBg = STATUS_CONFIG[status].rowBg
                      return (
                        <tr
                          key={student.id}
                          className={`transition-all duration-150 hover:bg-white/60 ${rowBg}`}
                        >
                          {/* # */}
                          <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">
                            {String(idx + 1).padStart(2, '0')}
                          </td>

                          {/* Roll No */}
                          <td className="px-4 py-3.5">
                            <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                              {student.roll_no}
                            </span>
                          </td>

                          {/* Name */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-extrabold shrink-0 shadow-sm shadow-indigo-300/40">
                                {student.full_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-semibold text-slate-800">{student.full_name}</span>
                            </div>
                          </td>

                          {/* Status toggle */}
                          <td className="px-5 py-3.5 text-right">
                            <StatusToggle
                              current={status}
                              onChange={(s) => {
                                setAttendance((prev) => ({ ...prev, [student.id]: s }))
                                setIsDirty(true)
                              }}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Save bar */}
            {students.length > 0 && (
              <div className="px-6 py-4 border-t border-white/60 bg-gradient-to-r from-slate-50/60 to-white/40 flex flex-col sm:flex-row items-center justify-between gap-4">
                <p className="text-xs text-slate-500 text-center sm:text-left">
                  Saving attendance for{' '}
                  <strong className="text-slate-700">{students.length} students</strong> in{' '}
                  <strong className="text-slate-700">{selectedSectionName}</strong> — {attendanceDate}
                  {isDirty && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-600 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Unsaved changes
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  disabled={!canSave || saveAttendance.isPending}
                  onClick={() => saveAttendance.mutate()}
                  className="shrink-0 flex items-center gap-2.5 px-7 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
                >
                  {saveAttendance.isPending ? (
                    <><SpinIcon /> Saving…</>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Save Attendance
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ── Empty State ──────────────────────────────────────────────────── */
          <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl shadow-slate-200/40 p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-5 shadow-inner">
              <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-slate-600 font-bold text-base">No section selected</p>
            <p className="text-slate-400 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              Use the filter panel above to pick a{' '}
              <strong className="text-slate-600">Regulation → Group → Section</strong>{' '}
              to begin marking attendance.
            </p>

            {/* Legend */}
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              {ALL_STATUSES.map((s) => (
                <div key={s} className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <span className={`w-2.5 h-2.5 rounded-full ${STATUS_CONFIG[s].dot}`} />
                  {STATUS_CONFIG[s].label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
