'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

const schema = z.object({
  group_id: z.string().min(1, 'Please select a Group'),
  name: z
    .string()
    .min(1, 'Section name is required')
    .max(50, 'Max 50 characters')
    .regex(/\S/, 'Cannot be only whitespace'),
})
type FormValues = z.infer<typeof schema>

export default function SectionSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [filterGroup, setFilterGroup] = useState('')

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, years(name)')
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
        .select('*, groups(name, years(name))')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { group_id: '', name: '' },
  })

  const addSection = useMutation({
    mutationFn: async (values: FormValues) => {
      const duplicate = sections.find(
        (s: any) =>
          s.group_id === values.group_id &&
          s.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`Section "${values.name}" already exists in this group.`)

      const { error } = await supabase
        .from('sections')
        .insert({ group_id: values.group_id, name: values.name.trim() })
      if (error) {
        if (error.code === '23505') throw new Error(`Section "${values.name}" already exists in this group.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sections'] })
      form.setValue('name', '')
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sections'] }),
    onError: (err: any) => setDeleteError(err.message),
  })

  const filteredSections = filterGroup
    ? sections.filter((s: any) => s.group_id === filterGroup)
    : sections

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-purple-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Sections</h2>
          <p className="text-xs text-slate-500">{sections.length} section{sections.length !== 1 ? 's' : ''} defined</p>
        </div>
      </div>

      <div className="p-5">
        {groups.length === 0 ? (
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-amber-700">No Groups Available</p>
            <p className="text-xs text-amber-600 mt-1">Create at least one Study Group first.</p>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit((v) => addSection.mutate(v))}
            className="space-y-3 mb-5"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Belongs to Group <span className="text-red-500">*</span></label>
              <select
                {...form.register('group_id')}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              >
                <option value="">Select a Group...</option>
                {groups.map((g: any) => (
                  <option key={g.id} value={g.id}>
                    {g.name} — {g.years?.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.group_id && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.group_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Section Name <span className="text-red-500">*</span></label>
              <input
                {...form.register('name')}
                placeholder="e.g. Section A, Morning Shift"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={addSection.isPending}
              className="w-full py-2 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {addSection.isPending ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Adding...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Section
                </>
              )}
            </button>
          </form>
        )}

        {deleteError && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {deleteError}
          </div>
        )}

        {/* Filter */}
        {sections.length > 0 && groups.length > 0 && (
          <div className="mb-3">
            <select
              value={filterGroup}
              onChange={(e) => setFilterGroup(e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 outline-none text-slate-600"
            >
              <option value="">Show all sections</option>
              {groups.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {g.years?.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filteredSections.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No sections yet. Add your first section above.
            </div>
          ) : (
            filteredSections.map((section: any) => (
              <div
                key={section.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 group/item"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{section.name}</p>
                  <p className="text-xs text-violet-500 mt-0.5">
                    {section.groups?.name}
                    {section.groups?.years?.name ? ` · ${section.groups.years.name}` : ''}
                  </p>
                </div>
                <button
                  onClick={() => deleteSection.mutate(section.id)}
                  disabled={deleteSection.isPending}
                  className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-md hover:bg-red-50 disabled:opacity-40"
                  title="Delete Section"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
