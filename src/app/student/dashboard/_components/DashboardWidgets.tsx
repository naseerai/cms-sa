'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

// ── Circular Progress Ring ─────────────────────────────────────────────────────

export function AttendanceRing({ pct }: { pct: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (pct / 100) * circ
  const good = pct >= 75
  const stroke = good ? '#10b981' : '#ef4444'
  const track  = good ? '#d1fae5' : '#fee2e2'
  const text   = good ? 'text-emerald-500' : 'text-red-500'
  const badge  = good
    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : 'bg-red-100 text-red-600 border-red-200'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 124 124">
          <circle cx="62" cy="62" r={r} fill="none" stroke={track} strokeWidth="11" />
          <circle
            cx="62" cy="62" r={r} fill="none"
            stroke={stroke} strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-4xl font-black ${text}`}>{pct}%</span>
          <span className="text-xs text-slate-400 font-semibold mt-0.5">Attendance</span>
        </div>
      </div>
      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${badge}`}>
        {good ? '✓ Good Standing' : '⚠ Below Requirement'}
      </span>
    </div>
  )
}

// ── Notice Card with expander ──────────────────────────────────────────────────

interface Notice { id: string; title: string; content: string; created_at: string }

const ACCENTS = [
  { bar: 'bg-amber-400',   dot: 'bg-amber-400',   icon: 'text-amber-500'  },
  { bar: 'bg-blue-500',    dot: 'bg-blue-500',    icon: 'text-blue-500'   },
  { bar: 'bg-violet-500',  dot: 'bg-violet-500',  icon: 'text-violet-500' },
  { bar: 'bg-emerald-500', dot: 'bg-emerald-500', icon: 'text-emerald-500'},
  { bar: 'bg-rose-500',    dot: 'bg-rose-500',    icon: 'text-rose-500'   },
]

function NoticeCard({ notice, idx }: { notice: Notice; idx: number }) {
  const [open, setOpen] = useState(false)
  const ac = ACCENTS[idx % ACCENTS.length]
  const date = new Date(notice.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm overflow-hidden flex group hover:shadow-md transition-all duration-200">
      <div className={`w-1 shrink-0 ${ac.bar}`} />
      <div className="flex-1 p-4">
        <div className="flex items-start gap-3">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ac.dot}`} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 text-sm leading-snug">{notice.title}</p>
            <p className="text-xs text-slate-400 mt-0.5">{date}</p>
          </div>
          <button
            onClick={() => setOpen(v => !v)}
            className="shrink-0 flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            {open ? <><ChevronUp className="w-3.5 h-3.5" /> Less</> : <><ChevronDown className="w-3.5 h-3.5" /> More</>}
          </button>
        </div>
        {open && (
          <p className="text-slate-600 text-sm mt-3 leading-relaxed whitespace-pre-wrap pl-5 border-l-2 border-slate-100">
            {notice.content}
          </p>
        )}
      </div>
    </div>
  )
}

export function NoticeBoard({ notices }: { notices: Notice[] }) {
  return (
    <div className="space-y-3">
      {notices.map((n, i) => <NoticeCard key={n.id} notice={n} idx={i} />)}
    </div>
  )
}
