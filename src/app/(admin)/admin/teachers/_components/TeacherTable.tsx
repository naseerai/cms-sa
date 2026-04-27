'use client'

import { useState, useTransition } from 'react'
import {
  createTeacher,
  deleteTeacher,
  updateTeacher,
  type TeacherRecord,
  type CreateTeacherResult,
} from '@/app/actions/teacher'
import { useToast } from '@/hooks/useToast'
import Toaster from '@/components/ui/Toaster'

const EMAIL_DOMAIN = '@nexuscollege.com'
const DEFAULT_PASSWORD = 'Nexus@Teacher123'

const SpinIcon = ({ size = 4 }: { size?: number }) => (
  <svg className={`animate-spin h-${size} w-${size}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

// ─── Success Modal shown after teacher creation ───────────────────────────────

function CredentialsModal({ result, onClose }: { result: CreateTeacherResult; onClose: () => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-white font-bold">Teacher Created!</h2>
            <p className="text-teal-100 text-xs mt-0.5">Account is ready to use</p>
          </div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 items-start text-xs">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-700 font-medium">Share these credentials with the teacher. They will <strong>not</strong> be shown again.</p>
          </div>
          {[
            { label: 'Login Email', value: result.email, key: 'email' },
            { label: 'Password', value: result.password, key: 'pw' },
          ].map(({ label, value, key }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="flex-1 font-mono text-sm text-slate-800 break-all">{value}</span>
                <button onClick={() => copy(value, key)} className="text-slate-400 hover:text-blue-600 shrink-0">
                  {copied === key
                    ? <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold rounded-xl transition">
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Teacher Modal ────────────────────────────────────────────────────────

function AddTeacherModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (t: TeacherRecord) => void
}) {
  const [fullName, setFullName] = useState('')
  const [prefix, setPrefix] = useState('')
  const [customPassword, setCustomPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [createdResult, setCreatedResult] = useState<CreateTeacherResult | null>(null)
  const { toast, toasts, dismiss } = useToast()

  function handleCreate() {
    if (!fullName.trim() || !prefix.trim()) {
      toast({
        title: 'All fields required',
        description: 'Please fill in Full Name and Email Prefix.',
        variant: 'error',
      })
      return
    }

    startTransition(async () => {
      try {
        const result = await createTeacher({
          full_name: fullName.trim(),
          email_prefix: prefix.trim().toLowerCase(),
          password: customPassword.trim() || undefined,
        })

        setCreatedResult(result)

        onCreated({
          id: result.id,
          full_name: result.full_name,
          email: result.email,
          created_at: result.created_at,
        })
      } catch (err: any) {
        toast({
          title: 'Creation failed',
          description: err.message,
          variant: 'error',
        })
      }
    })
  }

  if (createdResult) {
    return <CredentialsModal result={createdResult} onClose={onClose} />
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-teal-500 to-emerald-600 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">Add Teacher</h2>
                <p className="text-teal-100 text-xs mt-0.5">
                  Creates a new login account with teacher role
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Dr. Ahmed Khan"
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Email Prefix <span className="text-red-500">*</span>
              </label>

              <div className="flex items-stretch rounded-lg border border-slate-200 overflow-hidden">
                <input
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value.replace(/\s+/g, '.'))}
                  placeholder="e.g. ahmed.khan"
                  className="flex-1 text-sm px-3.5 py-2.5"
                />
                <span className="flex items-center px-3 bg-teal-50 text-teal-700 text-sm font-mono border-l border-slate-200">
                  {EMAIL_DOMAIN}
                </span>
              </div>

              {prefix && (
                <p className="text-xs text-slate-500 mt-1">
                  Login email:{' '}
                  <span className="font-mono font-medium">
                    {prefix.toLowerCase()}
                    {EMAIL_DOMAIN}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder={`Default: ${DEFAULT_PASSWORD}`}
                  className="w-full text-sm px-3.5 py-2.5 pr-10 border border-slate-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Leave blank to use the default password above.
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 bg-white text-slate-700 text-sm font-semibold rounded-xl"
            >
              Cancel
            </button>

            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white text-sm font-bold rounded-xl"
            >
              {isPending ? (
                <>
                  <SpinIcon /> Creating…
                </>
              ) : (
                <>Create Teacher</>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
function EditTeacherModal({
  teacher,
  onClose,
  onUpdated,
}: {
  teacher: TeacherRecord
  onClose: () => void
  onUpdated: (t: TeacherRecord) => void
}) {
  const [fullName, setFullName] = useState(teacher.full_name || '')
  const [prefix, setPrefix] = useState(
    teacher.email?.replace(EMAIL_DOMAIN, '') || ''
  )
  const [customPassword, setCustomPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { toast, toasts, dismiss } = useToast()

  function handleUpdate() {
    if (!fullName.trim() || !prefix.trim()) {
      toast({
        title: 'All fields required',
        description: 'Please fill in Full Name and Email Prefix.',
        variant: 'error',
      })
      return
    }

    startTransition(async () => {
      try {
        const updatedEmail = `${prefix.trim().toLowerCase()}${EMAIL_DOMAIN}`

        await updateTeacher(teacher.id, {
          full_name: fullName.trim(),
          email: updatedEmail,
          password: customPassword.trim() || undefined,
        })

        onUpdated({
          ...teacher,
          full_name: fullName.trim(),
          email: updatedEmail,
        })

        toast({
          title: 'Teacher updated',
          description: 'Teacher credentials updated successfully.',
          variant: 'success',
        })

        onClose()
      } catch (err: any) {
        toast({
          title: 'Update failed',
          description: err.message,
          variant: 'error',
        })
      }
    })
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-5 flex items-center justify-between">
            <div>
              <h2 className="text-white font-bold text-sm">Edit Teacher</h2>
              <p className="text-blue-100 text-xs mt-0.5">
                Update teacher credentials and details
              </p>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-6 space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Full Name
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                Email Prefix
              </label>

              <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                <input
                  value={prefix}
                  onChange={(e) =>
                    setPrefix(e.target.value.replace(/\s+/g, '.'))
                  }
                  className="flex-1 text-sm px-3.5 py-2.5"
                />
                <span className="px-3 flex items-center bg-slate-50 text-sm font-mono">
                  {EMAIL_DOMAIN}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1.5">
                New Password
              </label>

              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  className="w-full text-sm px-3.5 py-2.5 pr-10 border border-slate-200 rounded-lg"
                />

                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl"
            >
              Cancel
            </button>

            <button
              onClick={handleUpdate}
              disabled={isPending}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
            >
              {isPending ? 'Updating…' : 'Update Teacher'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ─── Main Teacher Table ───────────────────────────────────────────────────────

export default function TeacherTable({ initialTeachers }: { initialTeachers: TeacherRecord[] }) {
  const [teachers, setTeachers] = useState<TeacherRecord[]>(initialTeachers)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingTeacher, setEditingTeacher] = useState<TeacherRecord | null>(null)
  const [isPending, startTransition] = useTransition()
  const { toast, toasts, dismiss } = useToast()

  function handleDelete(teacher: TeacherRecord) {
    if (!confirm(`Permanently delete ${teacher.full_name ?? teacher.email ?? 'this teacher'}? This cannot be undone.`)) return
    setRemovingId(teacher.id)
    startTransition(async () => {
      try {
        await deleteTeacher(teacher.id)
        setTeachers((prev) => prev.filter((t) => t.id !== teacher.id))
        toast({ title: 'Teacher deleted', description: `${teacher.full_name ?? teacher.email} has been removed.`, variant: 'success' })
      } catch (err: any) {
        toast({ title: 'Delete failed', description: err.message, variant: 'error' })
      } finally {
        setRemovingId(null)
      }
    })
  }

  function handleCreated(t: TeacherRecord) {
    setTeachers((prev) => [t, ...prev])
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />
      {showAddModal && <AddTeacherModal onClose={() => setShowAddModal(false)} onCreated={handleCreated} />}

      {/* Header row with Add button */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{teachers.length} teacher{teachers.length !== 1 ? 's' : ''} registered</p>
        <button
          id="add-teacher-btn"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-teal-500/25 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Teacher
        </button>
      </div>
      {editingTeacher && (
  <EditTeacherModal
    teacher={editingTeacher}
    onClose={() => setEditingTeacher(null)}
    onUpdated={(updated) => {
      setTeachers((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t))
      )
      setEditingTeacher(null)
    }}
  />
)}

      {teachers.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl p-14 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 flex items-center justify-center mx-auto mb-5">
            <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-slate-600 font-bold">No teachers yet</p>
          <p className="text-slate-400 text-sm mt-1">Click <strong>Add Teacher</strong> above to create the first one.</p>
        </div>
      ) : (
        <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="text-left px-5 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider w-10">#</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {teachers.map((t, idx) => {
                  const isDeleting = removingId === t.id
                  const display = t.full_name ?? t.email ?? 'Teacher'
                  return (
                    <tr key={t.id} className="hover:bg-white/80 transition-colors">
                      <td className="px-5 py-3.5 text-xs text-slate-300 font-mono">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                            {display.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-800">{t.full_name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 text-xs font-mono">{t.email ?? '—'}</td>
                      <td className="px-4 py-3.5 text-slate-500 text-xs">
                        {new Date(t.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3.5 text-right">
  <button
    onClick={() => setEditingTeacher(t)}
    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-500 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg mr-2"
  >
    Edit
  </button>

  <button
    onClick={() => handleDelete(t)}
    disabled={isDeleting || isPending}
    className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1.5 rounded-lg border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
  >
    {isDeleting ? (
      <SpinIcon size={3} />
    ) : (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
        />
      </svg>
    )}
    Delete
  </button>
</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  )
}
