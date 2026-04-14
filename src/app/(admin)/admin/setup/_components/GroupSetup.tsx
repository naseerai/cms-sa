'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

const schema = z.object({
  year_id: z.string().min(1, 'Please select a Year'),
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Max 100 characters')
    .regex(/\S/, 'Cannot be only whitespace'),
})
type FormValues = z.infer<typeof schema>

export default function GroupSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: years = [] } = useQuery({
    queryKey: ['years'],
    queryFn: async () => {
      const { data, error } = await supabase.from('years').select('*').order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  const { data: groups = [], isLoading } = useQuery({
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

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { year_id: '', name: '' },
  })

  const selectedYearId = form.watch('year_id')

  const addGroup = useMutation({
    mutationFn: async (values: FormValues) => {
      const duplicate = groups.find(
        (g: any) =>
          g.year_id === values.year_id &&
          g.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`Group "${values.name}" already exists in this year.`)

      const { error } = await supabase
        .from('groups')
        .insert({ year_id: values.year_id, name: values.name.trim() })
      if (error) {
        if (error.code === '23505') throw new Error(`Group "${values.name}" already exists in this year.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['groups'] })
      form.setValue('name', '')
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
    },
    onError: (err: any) => setDeleteError(err.message),
  })

  const filteredGroups = selectedYearId
    ? groups.filter((g: any) => g.year_id === selectedYearId)
    : groups

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-violet-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Study Groups</h2>
          <p className="text-xs text-slate-500">{groups.length} group{groups.length !== 1 ? 's' : ''} defined</p>
        </div>
      </div>

      <div className="p-5">
        {years.length === 0 ? (
          <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-8 h-8 text-amber-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-amber-700">No Years Available</p>
            <p className="text-xs text-amber-600 mt-1">Create at least one Academic Year first.</p>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit((v) => addGroup.mutate(v))}
            className="space-y-3 mb-5"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Belongs to Year <span className="text-red-500">*</span></label>
              <select
                {...form.register('year_id')}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              >
                <option value="">Select a Year...</option>
                {years.map((y: any) => (
                  <option key={y.id} value={y.id}>{y.name}</option>
                ))}
              </select>
              {form.formState.errors.year_id && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.year_id.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Group Name <span className="text-red-500">*</span></label>
              <input
                {...form.register('name')}
                placeholder="e.g. Computer Science, Pre-Medical"
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={addGroup.isPending}
              className="w-full py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {addGroup.isPending ? (
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
                  Add Group
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

        {/* Filter toggle */}
        {groups.length > 0 && years.length > 0 && (
          <div className="mb-3">
            <select
              value={selectedYearId}
              onChange={(e) => form.setValue('year_id', e.target.value)}
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 outline-none text-slate-600"
            >
              <option value="">Show all groups</option>
              {years.map((y: any) => (
                <option key={y.id} value={y.id}>{y.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No groups yet. Add your first group above.
            </div>
          ) : (
            filteredGroups.map((group: any) => (
              <div
                key={group.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 group/item"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{group.name}</p>
                  <p className="text-xs text-indigo-500 mt-0.5">{group.years?.name}</p>
                </div>
                <button
                  onClick={() => deleteGroup.mutate(group.id)}
                  disabled={deleteGroup.isPending}
                  className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-md hover:bg-red-50 disabled:opacity-40"
                  title="Delete Group"
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
