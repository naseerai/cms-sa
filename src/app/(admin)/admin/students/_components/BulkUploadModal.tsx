'use client'

import { useState, useRef, useCallback } from 'react'
import Papa from 'papaparse'
import { lookupAcademicIds, bulkCreateStudent, type BulkCreateResult } from '@/app/actions/student'
import { useQueryClient } from '@tanstack/react-query'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  full_name: string
  roll_no: string
  password: string
  phone?: string
  parent_name: string
  parent_mobile: string
  regulation_name: string
  group_name: string
  section_name: string
}

// ─── CSV Template ─────────────────────────────────────────────────────────────

const CSV_HEADERS = [
  'full_name', 'roll_no', 'password', 'phone',
  'parent_name', 'parent_mobile',
  'regulation_name', 'group_name', 'section_name',
]

const CSV_SAMPLE = [
  'Mohammed Ali Khan', 'CS-2024-001', 'Pass@1234', '+92 300 0000001',
  'Mr. Ahmed Khan', '+92 300 0000002', 'R24', 'CSE Batch A', 'Section A',
].join(',')

function downloadTemplate() {
  const content = CSV_HEADERS.join(',') + '\n' + CSV_SAMPLE
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'nexus_bulk_student_template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SpinIcon({ size = 'h-4 w-4' }: { size?: string }) {
  return (
    <svg className={`animate-spin ${size}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500 font-semibold">
        <span>Onboarding student {value} of {max}…</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface Props { onClose: () => void }

type Phase = 'idle' | 'preview' | 'running' | 'done'

export default function BulkUploadModal({ onClose }: Props) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [phase, setPhase]           = useState<Phase>('idle')
  const [rows, setRows]             = useState<CsvRow[]>([])
  const [parseError, setParseError] = useState('')
  const [progress, setProgress]     = useState(0)
  const [results, setResults]       = useState<BulkCreateResult[]>([])
  const [dragOver, setDragOver]     = useState(false)

  // ── Parse CSV ─────────────────────────────────────────────────────────────

  const parseFile = useCallback((file: File) => {
    setParseError('')
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (res) => {
        const missingCols = CSV_HEADERS.filter(h => !res.meta.fields?.includes(h))
        if (missingCols.length > 0) {
          setParseError(`Missing columns: ${missingCols.join(', ')}. Please use the template.`)
          return
        }
        if (res.data.length === 0) {
          setParseError('The CSV file has no data rows.')
          return
        }
        setRows(res.data)
        setPhase('preview')
      },
      error: (err) => setParseError(`Parse error: ${err.message}`),
    })
  }, [])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) parseFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f && f.name.endsWith('.csv')) parseFile(f)
    else setParseError('Please drop a .csv file.')
  }

  // ── Run Import ────────────────────────────────────────────────────────────

  async function runImport() {
    setPhase('running')
    setProgress(0)
    setResults([])

    // 1. Pre-fetch all academic name→id maps (one DB round-trip)
    let maps: Awaited<ReturnType<typeof lookupAcademicIds>>
    try {
      maps = await lookupAcademicIds()
    } catch (e: any) {
      setParseError(`Failed to load academic data: ${e.message}`)
      setPhase('preview')
      return
    }

    const allResults: BulkCreateResult[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      setProgress(i + 1)

      // Resolve name → UUID
      const regId = maps.regulations[row.regulation_name?.trim().toLowerCase()]
      const grpId = maps.groups[row.group_name?.trim().toLowerCase()]
      const secId = maps.sections[row.section_name?.trim().toLowerCase()]

      if (!regId || !grpId || !secId) {
        allResults.push({
          roll_no: row.roll_no || `row-${i + 2}`,
          success: false,
          error: `Could not find: ${!regId ? `Regulation "${row.regulation_name}"` : ''} ${!grpId ? `Group "${row.group_name}"` : ''} ${!secId ? `Section "${row.section_name}"` : ''}`.trim(),
        })
        continue
      }

      if (!row.full_name?.trim() || !row.roll_no?.trim()) {
        allResults.push({
          roll_no: row.roll_no || `row-${i + 2}`,
          success: false,
          error: 'full_name and roll_no are required.',
        })
        continue
      }

      const result = await bulkCreateStudent({
        full_name:     row.full_name,
        roll_no:       row.roll_no,
        password:      row.password,
        phone:         row.phone,
        parent_name:   row.parent_name,
        parent_mobile: row.parent_mobile,
        regulation_id: regId,
        group_id:      grpId,
        section_id:    secId,
      })
      allResults.push(result)
    }

    setResults(allResults)
    setPhase('done')
    qc.invalidateQueries({ queryKey: ['students'] })
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const successCount = results.filter(r => r.success).length
  const failCount    = results.filter(r => !r.success).length

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm" onClick={phase !== 'running' ? onClose : undefined} />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
          style={{ maxHeight: '90vh', pointerEvents: 'auto', animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Bulk Student Upload</h2>
                <p className="text-blue-200 text-xs mt-0.5">Upload a CSV to enroll multiple students at once</p>
              </div>
            </div>
            {phase !== 'running' && (
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── IDLE / UPLOAD ──────────────────────────────────────────── */}
            {(phase === 'idle' || (phase === 'preview' && rows.length === 0)) && (
              <>
                {/* Template download */}
                <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                  <div className="flex items-center gap-2 text-xs text-indigo-700">
                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Required columns: <strong className="font-mono">{CSV_HEADERS.join(', ')}</strong></span>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 ml-3 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download Template
                  </button>
                </div>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                    dragOver ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50/60'
                  }`}
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700">Drop your CSV here</p>
                  <p className="text-xs text-slate-400 mt-1">or click to browse</p>
                  <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileInput} />
                </div>

                {parseError && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {parseError}
                  </div>
                )}
              </>
            )}

            {/* ── PREVIEW ────────────────────────────────────────────────── */}
            {phase === 'preview' && rows.length > 0 && (
              <>
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-semibold">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {rows.length} student{rows.length !== 1 ? 's' : ''} parsed successfully. Review before importing.
                </div>

                {parseError && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {parseError}
                  </div>
                )}

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {['#', 'Name', 'Roll No', 'Password', 'Regulation', 'Group', 'Section'].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {rows.slice(0, 10).map((row, i) => (
                        <tr key={i} className="hover:bg-blue-50/20">
                          <td className="px-3 py-2 text-slate-300 font-mono">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-2 font-semibold text-slate-700">{row.full_name || <span className="text-red-400">Missing!</span>}</td>
                          <td className="px-3 py-2 font-mono text-slate-600">{row.roll_no || <span className="text-red-400">Missing!</span>}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono">{row.password ? '••••••••' : <span className="text-amber-500">Auto-gen</span>}</td>
                          <td className="px-3 py-2 text-slate-500">{row.regulation_name}</td>
                          <td className="px-3 py-2 text-slate-500">{row.group_name}</td>
                          <td className="px-3 py-2 text-slate-500">{row.section_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {rows.length > 10 && (
                    <div className="px-3 py-2.5 text-xs text-slate-400 text-center border-t border-slate-100 bg-slate-50/60">
                      …and {rows.length - 10} more rows
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── RUNNING ────────────────────────────────────────────────── */}
            {phase === 'running' && (
              <div className="py-6 space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <SpinIcon size="h-5 w-5 text-indigo-600" />
                  <p className="text-sm font-bold text-slate-700">Importing students… Do not close this window.</p>
                </div>
                <ProgressBar value={progress} max={rows.length} />
                <p className="text-xs text-slate-400 text-center">Creating auth accounts and database records…</p>
              </div>
            )}

            {/* ── DONE ───────────────────────────────────────────────────── */}
            {phase === 'done' && (
              <>
                <div className={`flex items-center gap-3 p-4 rounded-xl border ${successCount > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {successCount > 0
                      ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    }
                  </svg>
                  <div>
                    <p className="font-bold text-sm">Import complete</p>
                    <p className="text-xs mt-0.5 opacity-80">
                      {successCount} enrolled successfully · {failCount} failed
                    </p>
                  </div>
                </div>

                {/* Results table */}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide">Roll No</th>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-3 py-2.5 font-bold text-slate-500 uppercase tracking-wide">Login / Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.map((r, i) => (
                        <tr key={i} className={r.success ? 'bg-emerald-50/20' : 'bg-red-50/30'}>
                          <td className="px-3 py-2 font-mono font-bold text-slate-700">{r.roll_no}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              r.success ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-600 border-red-200'
                            }`}>
                              {r.success ? '✓ Enrolled' : '✗ Failed'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">
                            {r.success ? (
                              <span className="text-emerald-700">Login: <strong>{r.roll_no.toLowerCase()}</strong> (roll number)</span>
                            ) : (
                              <span className="text-red-500 text-[11px]">{r.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
            {phase === 'idle' && (
              <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition">
                Cancel
              </button>
            )}
            {phase === 'preview' && (
              <>
                <button
                  onClick={() => { setRows([]); setParseError(''); setPhase('idle') }}
                  className="flex-1 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition"
                >
                  ← Re-upload
                </button>
                <button
                  onClick={runImport}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-sm font-bold rounded-xl shadow-md shadow-indigo-500/20 transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Import {rows.length} Students
                </button>
              </>
            )}
            {phase === 'running' && (
              <div className="flex-1 flex items-center justify-center text-sm text-slate-400 font-medium py-2">
                <SpinIcon size="h-4 w-4 mr-2" /> Processing…
              </div>
            )}
            {phase === 'done' && (
              <button
                onClick={onClose}
                className="flex-1 py-2.5 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white text-sm font-bold rounded-xl transition"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.94) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
      `}</style>
    </>
  )
}
