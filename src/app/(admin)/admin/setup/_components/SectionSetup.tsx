'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

/* ── Validation schema ─────────────────────────────────────────────────────── */
const schema = z.object({
  group_id: z.string().min(1, 'Please select a Group'),
  name: z
    .string()
    .min(1, 'Section name is required')
    .max(50, 'Maximum 50 characters')
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

const UsersIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
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
export default function SectionSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filterGroupId, setFilterGroupId] = useState('')

  /* queries */
  const { data: groups = [] } = useQuery({
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

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ['sections'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sections')
        .select('*, groups(name, regulations(name))')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  /* form */
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { group_id: '', name: '' },
  })

  const selectedGroupId = form.watch('group_id')

  /* filter logic – list filter is independent from form selection */
  const activeFilter = filterGroupId || selectedGroupId
  const filteredSections = activeFilter
    ? sections.filter((s: any) => s.group_id === activeFilter)
    : sections

  /* mutations */
  const addSection = useMutation({
    mutationFn: async (values: FormValues) => {
      const duplicate = sections.find(
        (s: any) =>
          s.group_id === values.group_id &&
          s.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`"${values.name}" already exists in this Group.`)

      const { error } = await supabase.from('sections').insert({
        group_id: values.group_id,
        name: values.name.trim(),
      })
      if (error) {
        if (error.code === '23505') throw new Error(`"${values.name}" already exists in this Group.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] })
      form.setValue('name', '')
      setDeleteError(null)
    },
    onError: (err: any) => form.setError('name', { message: err.message }),
  })

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      setDeleteError(null)
      const { error } = await supabase.from('sections').delete().eq('id', id)
      if (error) {
        if (error.code === '23503')
          throw new Error('Cannot delete: Students are assigned to this Section.')
        throw error
      }
    },
    onSuccess: () => {
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
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 via-purple-50 to-white flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow">
          <UsersIcon />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-slate-800 text-sm leading-tight">Sections</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? '…' : `${sections.length} section${sections.length !== 1 ? 's' : ''} defined`}
          </p>
        </div>
        <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-[10px] font-extrabold flex items-center justify-center">
          3
        </span>
      </div>

      <div className="p-5 flex flex-col gap-5 flex-1">
        {/* ── Empty state or form ── */}
        {groups.length === 0 ? (
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-xl">
            <WarnIcon />
            <p className="text-sm font-semibold text-amber-700">No Groups Found</p>
            <p className="text-xs text-amber-500 mt-1">Create at least one Group first.</p>
          </div>
        ) : (
          <form
            id="section-form"
            onSubmit={form.handleSubmit((v) => addSection.mutate(v))}
            className="space-y-3"
            noValidate
          >
            {/* Group selector */}
            <div>
              <label htmlFor="section-group" className="form-label form-label-required">
                Group
              </label>
              <div className="relative">
                <select
                  id="section-group"
                  {...form.register('group_id')}
                  className="form-input focus:ring-2 focus:ring-violet-500 focus:border-violet-500 appearance-none pr-8"
                >
                  <option value="">Select a Group…</option>
                  {groups.map((g: any) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.regulations?.name}
                    </option>
                  ))}
                </select>
                <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {form.formState.errors.group_id && (
                <p className="form-error">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {form.formState.errors.group_id.message}
                </p>
              )}
            </div>

            {/* Name field */}
            <div>
              <label htmlFor="section-name" className="form-label form-label-required">
                Section Name
              </label>
              <input
                id="section-name"
                {...form.register('name')}
                placeholder="e.g. Section A"
                autoComplete="off"
                className="form-input focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
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
              disabled={addSection.isPending}
              className="w-full py-2.5 text-sm font-bold bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white rounded-xl transition-all shadow-sm shadow-violet-500/30 disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {addSection.isPending ? (
                <><SpinIcon /> Adding…</>
              ) : (
                <><PlusIcon /> Add Section</>
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
              Current Sections
            </p>
            {sections.length > 0 && groups.length > 0 && (
              <select
                value={filterGroupId}
                onChange={(e) => setFilterGroupId(e.target.value)}
                className="text-[11px] px-2 py-1 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 outline-none focus:ring-2 focus:ring-violet-400 transition"
              >
                <option value="">All Groups</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.regulations?.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-sm">
              <SpinIcon /> Loading…
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-xl">
              <svg className="w-8 h-8 text-slate-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-sm text-slate-400">No sections yet</p>
              <p className="text-xs text-slate-300 mt-0.5">Add your first section above.</p>
            </div>
          ) : (
            filteredSections.map((section: any) => (
              <div
                key={section.id}
                className="group/item flex items-center justify-between px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 transition-all"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 text-xs font-extrabold flex items-center justify-center shrink-0">
                    {section.name.slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{section.name}</p>
                    <p className="text-xs text-violet-500 mt-0.5">
                      {section.groups?.name}
                      {section.groups?.regulations?.name ? ` · ${section.groups.regulations.name}` : ''}
                    </p>
                  </div>
                </div>

                {confirmDelete === section.id ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Delete?</span>
                    <button
                      onClick={() => deleteSection.mutate(section.id)}
                      disabled={deleteSection.isPending}
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
                    onClick={() => { setDeleteError(null); setConfirmDelete(section.id) }}
                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1.5 rounded-lg hover:bg-red-50"
                    title="Delete Section"
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
