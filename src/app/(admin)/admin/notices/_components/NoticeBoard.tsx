'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { useToast } from '@/hooks/useToast'
import Toaster from '@/components/ui/Toaster'

interface Notice {
  id: string
  title: string
  content: string
  created_at: string
}

const SpinIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function NoticeBoard() {
  const supabase = createClient()
  const qc = useQueryClient()
  const { toast, toasts, dismiss } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')

  const { data: notices = [], isLoading } = useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notices')
        .select('id, title, content, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Notice[]
    },
  })

  const postNotice = useMutation({
    mutationFn: async () => {
      if (!title.trim() || !content.trim()) throw new Error('Title and content are required.')
      const { error } = await supabase.from('notices').insert({ title: title.trim(), content: content.trim() })
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({ title: 'Notice posted!', description: 'Students will see it on their dashboard.', variant: 'success' })
      setTitle('')
      setContent('')
      qc.invalidateQueries({ queryKey: ['notices'] })
    },
    onError: (err: any) => {
      toast({ title: 'Failed to post', description: err.message, variant: 'error' })
    },
  })

  const deleteNotice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notices').delete().eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({ title: 'Notice deleted', variant: 'success' })
      qc.invalidateQueries({ queryKey: ['notices'] })
    },
    onError: (err: any) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'error' })
    },
  })

  const inputCls = 'w-full text-sm px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 outline-none transition shadow-sm'

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ── Post Form ── */}
        <div className="xl:col-span-2 bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-500/10 to-transparent flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Post a Notice</h2>
              <p className="text-xs text-slate-400 mt-0.5">Visible to all students immediately</p>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Title</label>
              <input
                id="notice-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exam schedule update"
                className={inputCls}
                maxLength={120}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Content</label>
              <textarea
                id="notice-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write the notice details here…"
                rows={5}
                className={inputCls + ' resize-none'}
              />
            </div>
            <button
              type="button"
              id="notice-submit"
              onClick={() => postNotice.mutate()}
              disabled={!title.trim() || !content.trim() || postNotice.isPending}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-amber-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed active:scale-95"
            >
              {postNotice.isPending ? <><SpinIcon /> Posting…</> : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Post Notice
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Notices Feed ── */}
        <div className="xl:col-span-3 bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl shadow-slate-200/60 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-500/10 to-transparent flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-md shadow-indigo-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">Posted Notices</h2>
              <p className="text-xs text-slate-400 mt-0.5">{notices.length} notice{notices.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100/80 max-h-[560px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 gap-3 text-slate-400">
                <SpinIcon /> <span className="text-sm">Loading notices…</span>
              </div>
            ) : notices.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm">No notices posted yet.</div>
            ) : notices.map((n) => (
              <div key={n.id} className="px-6 py-4 hover:bg-slate-50/60 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm leading-snug">{n.title}</p>
                    <p className="text-slate-500 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteNotice.mutate(n.id)}
                    className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    title="Delete notice"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
