'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createClient } from '@/utils/supabase/client'

const schema = z.object({
  name: z
    .string()
    .min(1, 'Year name is required')
    .max(50, 'Max 50 characters')
    .regex(/\S/, 'Cannot be only whitespace'),
  description: z.string().max(200).optional(),
})
type FormValues = z.infer<typeof schema>

export default function YearSetup() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: years = [], isLoading } = useQuery({
    queryKey: ['years'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('years')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', description: '' },
  })

  const addYear = useMutation({
    mutationFn: async (values: FormValues) => {
      // Client-side duplicate check for fast feedback
      const duplicate = years.find(
        (y: any) => y.name.toLowerCase().trim() === values.name.toLowerCase().trim()
      )
      if (duplicate) throw new Error(`Year "${values.name}" already exists.`)

      const { error } = await supabase
        .from('years')
        .insert({ name: values.name.trim(), description: values.description?.trim() || null })
      if (error) {
        if (error.code === '23505') throw new Error(`Year "${values.name}" already exists.`)
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] })
      form.reset()
    },
    onError: (err: any) => {
      form.setError('name', { message: err.message })
    },
  })

  const deleteYear = useMutation({
    mutationFn: async (id: string) => {
      setDeleteError(null)
      const { error } = await supabase.from('years').delete().eq('id', id)
      if (error) {
        if (error.code === '23503')
          throw new Error('Cannot delete: Groups are still attached to this Year.')
        throw error
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['years'] })
      qc.invalidateQueries({ queryKey: ['groups'] })
    },
    onError: (err: any) => setDeleteError(err.message),
  })

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-slate-800 text-sm">Academic Years</h2>
          <p className="text-xs text-slate-500">{years.length} year{years.length !== 1 ? 's' : ''} defined</p>
        </div>
      </div>

      <div className="p-5">
        <form
          onSubmit={form.handleSubmit((v) => addYear.mutate(v))}
          className="space-y-3 mb-5"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Year Name <span className="text-red-500">*</span></label>
            <input
              {...form.register('name')}
              placeholder="e.g. 1st Year, 2nd Year"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <input
              {...form.register('description')}
              placeholder="Short description"
              className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
            />
          </div>
          <button
            type="submit"
            disabled={addYear.isPending}
            className="w-full py-2 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-60 disabled:cursor-wait flex items-center justify-center gap-2"
          >
            {addYear.isPending ? (
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
                Add Year
              </>
            )}
          </button>
        </form>

        {deleteError && (
          <div className="mb-3 p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
            {deleteError}
          </div>
        )}

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : years.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              No years yet. Add your first academic year above.
            </div>
          ) : (
            years.map((year: any) => (
              <div
                key={year.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-50 border border-slate-100 group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{year.name}</p>
                  {year.description && (
                    <p className="text-xs text-slate-400 mt-0.5">{year.description}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteYear.mutate(year.id)}
                  disabled={deleteYear.isPending}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1 rounded-md hover:bg-red-50 disabled:opacity-40"
                  title="Delete Year"
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
