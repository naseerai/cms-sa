'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

/* ── Validation schema ─────────────────────────────────────────────────────── */
const regulationSchema = z.object({
  name: z
    .string()
    .min(1, 'Regulation name is required')
    .max(20, 'Maximum 20 characters allowed')
    .regex(/\S/, 'Name cannot be only whitespace'),
  duration_years: z.coerce
    .number({ invalid_type_error: 'Please select a duration' })
    .refine((v) => [2, 3, 4, 6].includes(v), 'Select 3, 4, or 6 years'),
})
type RegulationValues = z.infer<typeof regulationSchema>

/* ── Micro-icons ───────────────────────────────────────────────────────────── */
const SpinIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const BookIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
)

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
)

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function RegulationSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  /* queries */
  const { data: regulations = [], isLoading } = useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  /* form */
  const form = useForm<RegulationValues>({
    resolver: zodResolver(regulationSchema),
    defaultValues: { name: '', duration_years: 4 },
  })

  /* mutations */
  const addRegulation = useMutation({
    mutationFn: async (values: RegulationValues) => {
      const duplicate = regulations.find(
        (r: any) => r.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`"${values.name}" already exists.`)

      const { error } = await supabase.from('regulations').insert({
        name: values.name.trim(),
        duration_years: values.duration_years,
      })
      if (error) {
        if (error.code === '23505') throw new Error(`"${values.name}" already exists.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regulations'] })
      form.reset({ name: '', duration_years: 4 })
      setDeleteError(null)
    },
    onError: (err: any) => form.setError('name', { message: err.message }),
  })

  const deleteRegulation = useMutation({
    mutationFn: async (id: string) => {
      setDeleteError(null)
      const { error } = await supabase.from('regulations').delete().eq('id', id)
      if (error) {
        if (error.code === '23503')
          throw new Error('Cannot delete: Groups are still assigned to this Regulation.')
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['regulations'] })
      qc.invalidateQueries({ queryKey: ['groups'] })
      setConfirmDelete(null)
    },
    onError: (err: any) => {
      setDeleteError(err.message)
      setConfirmDelete(null)
    },
  })

  const durationLabel: Record<number, string> = { 3: '3-Year Program', 4: '4-Year Program', 6: '6-Year Program' }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-indigo-50 to-white flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow">
          <BookIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800 text-sm leading-tight">Regulations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? '…' : `${regulations.length} regulation${regulations.length !== 1 ? 's' : ''} defined`}
          </p>
        </div>
        {/* Step badge */}
        <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center">
          1
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5 flex-1">
        {/* ── Create form ── */}
        <form
          id="regulation-form"
          onSubmit={form.handleSubmit((v) => addRegulation.mutate(v))}
          className="space-y-3"
          noValidate
        >
          {/* Name field */}
          <div>
            <label htmlFor="reg-name" className="form-label form-label-required">
              Regulation Name
            </label>
            <input
              id="reg-name"
              {...form.register('name')}
              placeholder="e.g. R20, R23"
              autoComplete="off"
              className="form-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {form.formState.errors.name && (
              <p className="form-error">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Duration field */}
          <div>
            <label htmlFor="reg-duration" className="form-label form-label-required">
              Program Duration
              <span className="ml-1 font-normal text-slate-400">(reference only)</span>
            </label>
            <div className="relative">
              <select
                id="reg-duration"
                {...form.register('duration_years')}
                className="form-input focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                <option value={3}>3 Years</option>
                <option value={4}>4 Years</option>
                <option value={6}>6 Years</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {form.formState.errors.duration_years && (
              <p className="form-error">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {form.formState.errors.duration_years.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={addRegulation.isPending}
            className="w-full py-2.5 text-sm font-bold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl transition-all shadow-sm shadow-blue-500/30 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {addRegulation.isPending ? (
              <><SpinIcon /> Saving…</>
            ) : (
              <><PlusIcon /> Create Regulation</>
            )}
          </button>
        </form>

        {/* ── Inline error (delete) ── */}
        {deleteError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{deleteError}</span>
          </div>
        )}

        {/* ── List ── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Current Regulations
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
              <SpinIcon /> Loading…
            </div>
          ) : regulations.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-slate-400">No regulations yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Create your first one above.</p>
            </div>
          ) : (
            regulations.map((reg: any) => (
              <div
                key={reg.id}
                className="group/item flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {reg.name.slice(0, 3)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{reg.name}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{durationLabel[reg.duration_years] ?? `${reg.duration_years}-Year`}</p>
                  </div>
                </div>

                {confirmDelete === reg.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => deleteRegulation.mutate(reg.id)}
                      disabled={deleteRegulation.isPending}
                      className="text-[11px] font-bold px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="text-[11px] font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded-md hover:bg-slate-300 transition"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setDeleteError(null); setConfirmDelete(reg.id) }}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete Regulation"
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
