'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

/* ── Validation schema ─────────────────────────────────────────────────────── */
const schema = z.object({
  regulation_id: z.string().min(1, 'Please select a Regulation'),
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Maximum 100 characters')
    .regex(/\S/, 'Name cannot be only whitespace'),
})
type FormValues = z.infer<typeof schema>

/* ── Micro-icons ───────────────────────────────────────────────────────────── */
const SpinIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

const LayersIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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

const WarnIcon = () => (
  <svg className="w-8 h-8 text-amber-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

/* ── Component ─────────────────────────────────────────────────────────────── */
export default function GroupSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  /* queries */
  const { data: regulations = [] } = useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('regulations')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, regulations(name)')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  /* form */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { regulation_id: '', name: '' },
  })

  const selectedRegId = form.watch('regulation_id')

  /* filter state for the list (independent of the form) */
  const [filterRegId, setFilterRegId] = useState('')
  const activeFilter = filterRegId || selectedRegId
  const filteredGroups = activeFilter
    ? groups.filter((g: any) => g.regulation_id === activeFilter)
    : groups

  /* mutations */
  const addGroup = useMutation({
    mutationFn: async (values: FormValues) => {
      const duplicate = groups.find(
        (g: any) =>
          g.regulation_id === values.regulation_id &&
          g.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`"${values.name}" already exists in this Regulation.`)

      const { error } = await supabase.from('groups').insert({
        regulation_id: values.regulation_id,
        name: values.name.trim(),
      })
      if (error) {
        if (error.code === '23505') throw new Error(`"${values.name}" already exists in this Regulation.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      form.setValue('name', '')
      setDeleteError(null)
    },
    onError: (err: any) => form.setError('name', { message: err.message }),
  })

  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      setDeleteError(null)
      const { error } = await supabase.from('groups').delete().eq('id', id)
      if (error) {
        if (error.code === '23503')
          throw new Error('Cannot delete: Sections are still attached to this Group.')
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      qc.invalidateQueries({ queryKey: ['sections'] })
      setConfirmDelete(null)
    },
    onError: (err: any) => {
      setDeleteError(err.message)
      setConfirmDelete(null)
    },
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* ── Card Header ── */}
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-white flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow">
          <LayersIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800 text-sm leading-tight">Groups</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? '…' : `${groups.length} group${groups.length !== 1 ? 's' : ''} defined`}
          </p>
        </div>
        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold flex items-center justify-center">
          2
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5 flex-1">
        {/* ── Empty state or form ── */}
        {regulations.length === 0 ? (
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-xl">
            <WarnIcon />
            <p className="text-sm font-semibold text-amber-700">No Regulations Found</p>
            <p className="text-xs text-amber-500 mt-1">Create at least one Regulation first.</p>
          </div>
        ) : (
          <form
            id="group-form"
            onSubmit={form.handleSubmit((v) => addGroup.mutate(v))}
            className="space-y-3"
            noValidate
          >
            {/* Regulation selector */}
            <div>
              <label htmlFor="group-regulation" className="form-label form-label-required">
                Regulation
              </label>
              <div className="relative">
                <select
                  id="group-regulation"
                  {...form.register('regulation_id')}
                  className="form-input focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-8"
                >
                  <option value="">Select a Regulation…</option>
                  {regulations.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {r.duration_years}yr
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {form.formState.errors.regulation_id && (
                <p className="form-error">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {form.formState.errors.regulation_id.message}
                </p>
              )}
            </div>

            {/* Name field */}
            <div>
              <label htmlFor="group-name" className="form-label form-label-required">
                Group Name
              </label>
              <input
                id="group-name"
                {...form.register('name')}
                placeholder="e.g. CSE, ECE, MBA"
                autoComplete="off"
                className="form-input focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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

            <button
              type="submit"
              disabled={addGroup.isPending}
              className="w-full py-2.5 text-sm font-bold bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl transition-all shadow-sm shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {addGroup.isPending ? (
                <><SpinIcon /> Adding…</>
              ) : (
                <><PlusIcon /> Add Group</>
              )}
            </button>
          </form>
        )}

        {/* ── Delete error ── */}
        {deleteError && (
          <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
            <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{deleteError}</span>
          </div>
        )}

        {/* ── Filter + List ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Current Groups
            </p>
            {groups.length > 0 && regulations.length > 0 && (
              <select
                value={filterRegId}
                onChange={(e) => setFilterRegId(e.target.value)}
                className="text-[11px] px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none focus:ring-2 focus:ring-indigo-400 transition"
              >
                <option value="">All Regulations</option>
                {regulations.map((r: any) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
              <SpinIcon /> Loading…
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-sm text-slate-400">No groups yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Add your first group above.</p>
            </div>
          ) : (
            filteredGroups.map((group: any) => (
              <div
                key={group.id}
                className="group/item flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {group.name.slice(0, 3)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{group.name}</p>
                    <p className="text-xs text-indigo-500 mt-0.5">{group.regulations?.name ?? '—'}</p>
                  </div>
                </div>

                {confirmDelete === group.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => deleteGroup.mutate(group.id)}
                      disabled={deleteGroup.isPending}
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
                    onClick={() => { setDeleteError(null); setConfirmDelete(group.id) }}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete Group"
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
