'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { createClient } from '@/utils/supabase/client'
import { updateStudentAccount } from '@/app/actions/teacher'
import { useToast } from '@/hooks/useToast'
import Toaster from '@/components/ui/Toaster'

const STUDENT_DOMAIN = '@nexus.local'

export interface StudentRow {
  id: string
  user_id: string | null
  full_name: string
  roll_no: string
  phone: string | null
  parent_name: string
  parent_mobile: string
  regulation_id: string
  group_id: string
  section_id: string
}

interface EditStudentDrawerProps {
  student: StudentRow | null
  onClose: () => void
}

const inputCls =
  'w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition'
const disabledInputCls =
  'w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed outline-none'

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-2">{children}</h3>
}

const SpinIcon = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export default function EditStudentDrawer({ student, onClose }: EditStudentDrawerProps) {
  const supabase = createClient()
  const qc = useQueryClient()
  const { toast, toasts, dismiss } = useToast()

  // ── Student info state ────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('')
  const [rollNo, setRollNo] = useState('')
  const [phone, setPhone] = useState('')
  const [parentName, setParentName] = useState('')
  const [parentMobile, setParentMobile] = useState('')
  const [regulationId, setRegulationId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [sectionId, setSectionId] = useState('')

  // ── Account settings state ────────────────────────────────────────────────
  const [emailPrefix, setEmailPrefix] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [accountSaving, setAccountSaving] = useState(false)

  useEffect(() => {
    if (!student) return
    setFullName(student.full_name)
    setRollNo(student.roll_no)
    setPhone(student.phone ?? '')
    setParentName(student.parent_name)
    setParentMobile(student.parent_mobile)
    setRegulationId(student.regulation_id)
    setGroupId(student.group_id)
    setSectionId(student.section_id)
    setEmailPrefix('')
    setNewPassword('')
  }, [student])

  // ── Cascade lookups ───────────────────────────────────────────────────────
  const { data: regulations = [] } = useQuery({
    queryKey: ['regulations'],
    queryFn: async () => {
      const { data, error } = await supabase.from('regulations').select('id, name').order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
  const { data: groups = [] } = useQuery({
    queryKey: ['groups', regulationId],
    enabled: !!regulationId,
    queryFn: async () => {
      const { data, error } = await supabase.from('groups').select('id, name').eq('regulation_id', regulationId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })
  const { data: sections = [] } = useQuery({
    queryKey: ['sections', groupId],
    enabled: !!groupId,
    queryFn: async () => {
      const { data, error } = await supabase.from('sections').select('id, name').eq('group_id', groupId).order('created_at')
      if (error) throw error
      return data as { id: string; name: string }[]
    },
  })

  // ── Update profile mutation ───────────────────────────────────────────────
  const updateStudent = useMutation({
    mutationFn: async () => {
      if (!student) throw new Error('No student selected')
      if (!fullName.trim()) throw new Error('Full name is required')
      if (!rollNo.trim()) throw new Error('Roll number is required')
      if (!parentName.trim()) throw new Error('Parent name is required')
      if (!parentMobile.trim()) throw new Error('Parent mobile is required')
      if (!regulationId || !groupId || !sectionId) throw new Error('Please select Regulation, Group, and Section')

      // Unique roll_no check (exclude self)
      if (rollNo.trim() !== student.roll_no) {
        const { data: existing } = await supabase
          .from('students')
          .select('id')
          .eq('roll_no', rollNo.trim())
          .neq('id', student.id)
          .maybeSingle()
        if (existing) throw new Error(`Roll Number "${rollNo.trim()}" is already taken by another student.`)
      }

      const { error } = await supabase
        .from('students')
        .update({
          full_name: fullName.trim(),
          roll_no: rollNo.trim(),
          phone: phone.trim() || null,
          parent_name: parentName.trim(),
          parent_mobile: parentMobile.trim(),
          regulation_id: regulationId,
          group_id: groupId,
          section_id: sectionId,
        })
        .eq('id', student.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      toast({ title: 'Student updated!', variant: 'success' })
      qc.invalidateQueries({ queryKey: ['students'] })
      onClose()
    },
    onError: (err: any) => toast({ title: 'Update failed', description: err.message, variant: 'error' }),
  })

  // ── Account settings save ─────────────────────────────────────────────────
  async function handleAccountSave() {
    if (!student?.user_id) {
      toast({ title: 'No auth account', description: 'This student has no linked login account.', variant: 'error' })
      return
    }
    if (!emailPrefix.trim() && !newPassword.trim()) {
      toast({ title: 'Nothing to update', description: 'Enter a new Roll Number or password.', variant: 'error' })
      return
    }
    setAccountSaving(true)
    try {
      const updates: { email?: string; password?: string } = {}
      if (emailPrefix.trim()) {
        const slug = emailPrefix.trim().toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9._-]/g, '-')
        updates.email = `${slug}${STUDENT_DOMAIN}`
      }
      if (newPassword.trim()) updates.password = newPassword.trim()
      await updateStudentAccount(student.user_id, updates)
      toast({ title: 'Account updated!', description: 'Credentials have been saved.', variant: 'success' })
      setEmailPrefix('')
      setNewPassword('')
    } catch (err: any) {
      toast({ title: 'Account update failed', description: err.message, variant: 'error' })
    } finally {
      setAccountSaving(false)
    }
  }

  if (!student) return null

  const ChevronDown = () => (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-over */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-lg bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h2 className="font-bold text-white text-sm">Edit Student</h2>
              <p className="text-blue-200 text-xs mt-0.5">{student.full_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">

          {/* ── Personal Info ── */}
          <div className="space-y-4">
            <SectionTitle>Personal Information</SectionTitle>
            <div>
              <Label required>Full Name</Label>
              <input id="edit-full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Mohammed Ali Khan" className={inputCls} />
            </div>
            <div>
              <Label required>Roll Number</Label>
              <input id="edit-roll-no" value={rollNo} onChange={(e) => setRollNo(e.target.value)} placeholder="e.g. CS-2026-001" className={inputCls} />
              <p className="text-xs text-slate-400 mt-1">Changing the roll number will be validated for uniqueness.</p>
            </div>
            <div>
              <Label>Phone Number</Label>
              <input id="edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+92 300 0000000" className={inputCls} />
            </div>
          </div>

          {/* ── Parent Info ── */}
          <div className="space-y-4">
            <SectionTitle>Parent / Guardian</SectionTitle>
            <div>
              <Label required>Parent / Guardian Name</Label>
              <input id="edit-parent-name" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Mr. Ahmed Khan" className={inputCls} />
            </div>
            <div>
              <Label required>Parent Mobile</Label>
              <input id="edit-parent-mobile" value={parentMobile} onChange={(e) => setParentMobile(e.target.value)} placeholder="+92 300 0000000" className={inputCls} />
            </div>
          </div>

          {/* ── Academic Assignment ── */}
          <div className="space-y-4">
            <SectionTitle>Academic Assignment</SectionTitle>
            <div>
              <Label required>Regulation</Label>
              <div className="relative">
                <select id="edit-regulation" value={regulationId} onChange={(e) => { setRegulationId(e.target.value); setGroupId(''); setSectionId('') }} className={inputCls + ' appearance-none pr-8 bg-white'}>
                  <option value="">Select Regulation…</option>
                  {regulations.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>
            <div>
              <Label required>Group / Batch</Label>
              <div className="relative">
                <select id="edit-group" value={groupId} onChange={(e) => { setGroupId(e.target.value); setSectionId('') }} disabled={!regulationId} className={(!regulationId ? disabledInputCls : inputCls) + ' appearance-none pr-8'}>
                  <option value="">{regulationId ? 'Select Group…' : 'Select Regulation first'}</option>
                  {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>
            <div>
              <Label required>Section</Label>
              <div className="relative">
                <select id="edit-section" value={sectionId} onChange={(e) => setSectionId(e.target.value)} disabled={!groupId} className={(!groupId ? disabledInputCls : inputCls) + ' appearance-none pr-8'}>
                  <option value="">{groupId ? 'Select Section…' : 'Select Group first'}</option>
                  {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown />
              </div>
            </div>
          </div>

          {/* ── Account Settings ── */}
          <div className="space-y-4">
            <SectionTitle>Account Settings</SectionTitle>
            {!student.user_id ? (
              <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                This student has no login account yet. Create credentials in the Onboard Student form.
              </div>
            ) : (
              <>
                <div>
                  <Label>New Roll Number (Username)</Label>
                  <div className="flex items-stretch rounded-lg border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition">
                    <input
                      id="edit-email-prefix"
                      value={emailPrefix}
                      onChange={(e) => setEmailPrefix(e.target.value)}
                      placeholder={student.roll_no || 'e.g. CS-2024-001'}
                      autoComplete="off"
                      className="flex-1 text-sm px-3.5 py-2.5 bg-white text-slate-800 placeholder:text-slate-400 outline-none min-w-0"
                    />
                    <span className="flex items-center px-3 bg-slate-100 text-slate-500 text-sm font-mono border-l border-slate-200 whitespace-nowrap select-none">
                      {STUDENT_DOMAIN}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Students log in with their Roll Number. Leave blank to keep current.</p>
                </div>
                <div>
                  <Label>New Password</Label>
                  <div className="relative">
                    <input
                      id="edit-password"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Leave blank to keep current"
                      className={inputCls + ' pr-10'}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAccountSave}
                  disabled={accountSaving}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
                >
                  {accountSaving ? <><SpinIcon /> Updating credentials…</> : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Update Credentials
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 shrink-0">
          <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition">
            Cancel
          </button>
          <button
            type="button"
            id="edit-student-save"
            onClick={() => updateStudent.mutate()}
            disabled={updateStudent.isPending}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/20 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {updateStudent.isPending ? <><SpinIcon /> Saving…</> : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Save Changes</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
