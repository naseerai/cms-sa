'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { createStudent } from '@/app/actions/student'
import { useToast } from '@/hooks/useToast'
import Toaster from '@/components/ui/Toaster'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50)
    .regex(/^[a-zA-Z0-9._]+$/, 'Only letters, numbers, dots and underscores allowed'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),

  first_name: z.string().min(2, 'First name is required'),
  last_name: z.string().min(2, 'Last name is required'),
  roll_no: z.string().min(1, 'Roll number is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone: z.string().optional(),
  address: z.string().optional(),

  year_id: z.string().min(1, 'Please select a year'),
  group_id: z.string().min(1, 'Please select a group'),
  section_id: z.string().min(1, 'Please select a section'),

  guardian_name: z.string().min(2, 'Guardian name is required'),
  guardian_phone: z.string().min(7, 'Valid guardian phone required'),
})

type FormValues = z.infer<typeof schema>

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="flex items-center gap-1 text-red-500 text-xs mt-1">
      <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  )
}

function SectionHeader({ step, color, title, subtitle }: {
  step: string; color: string; title: string; subtitle: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-7 h-7 rounded-full ${color} text-white text-xs font-bold flex items-center justify-center shrink-0`}>
        {step}
      </div>
      <div>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
    </div>
  )
}

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

const inputCls =
  'w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition'

const disabledSelectCls =
  'w-full text-sm px-3.5 py-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-400 cursor-not-allowed outline-none '

// ─── Success Modal ────────────────────────────────────────────────────────────

function CredentialModal({
  email,
  password,
  onClose,
}: {
  email: string
  password: string
  onClose: () => void
}) {
  const [copied, setCopied] = useState<'email' | 'password' | null>(null)

  const copy = (text: string, field: 'email' | 'password') => {
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-modal-in"
        style={{ animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-bold text-lg">Student Enrolled!</h2>
              <p className="text-emerald-100 text-xs mt-0.5">Login credentials generated successfully</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 items-start">
            <svg className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-xs text-amber-700 font-medium">
              Save these credentials now. They will <strong>not be shown again</strong>.
            </p>
          </div>

          {[
            { label: 'Login Email', value: email, field: 'email' as const },
            { label: 'Password', value: password, field: 'password' as const },
          ].map(({ label, value, field }) => (
            <div key={field}>
              <p className="text-xs font-semibold text-slate-500 mb-1.5">{label}</p>
              <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 px-3 py-2.5">
                <span className="flex-1 font-mono text-sm text-slate-800 break-all">{value}</span>
                <button
                  onClick={() => copy(value, field)}
                  className="text-slate-400 hover:text-blue-600 transition-colors shrink-0"
                  title="Copy"
                >
                  {copied === field ? (
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition"
          >
            Enroll Another
          </button>
          <a
            href="/admin/students"
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition text-center"
          >
            View All Students
          </a>
        </div>
      </div>
      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.90) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);     }
        }
      `}</style>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentForm() {
  const supabase = createClient()
  const router = useRouter()
  const { toast, toasts, dismiss } = useToast()

  const [years, setYears] = useState<{ id: string; name: string }[]>([])
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([])
  const [sections, setSections] = useState<{ id: string; name: string }[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: '', password: '',
      first_name: '', last_name: '', roll_no: '', gender: '',
      phone: '', address: '',
      year_id: '', group_id: '', section_id: '',
      guardian_name: '', guardian_phone: '',
    },
  })

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = form
  const selectedYear = watch('year_id')
  const selectedGroup = watch('group_id')

  // ── Fetch Years on mount ─────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('years').select('id, name').order('created_at').then(({ data, error }) => {
      if (error) {
        toast({ title: 'Failed to load years', description: error.message, variant: 'error' })
        return
      }
      setYears(data || [])
    })
  }, []) // eslint-disable-line

  // ── Cascade: Year → Groups ───────────────────────────────────────────────
  useEffect(() => {
    // Always reset downstream
    setValue('group_id', '')
    setValue('section_id', '')
    setGroups([])
    setSections([])

    if (!selectedYear) return

    setGroupsLoading(true)
    supabase
      .from('groups')
      .select('id, name')
      .eq('year_id', selectedYear)
      .order('created_at')
      .then(({ data, error }) => {
        setGroupsLoading(false)
        if (error) {
          toast({ title: 'Failed to load groups', description: error.message, variant: 'error' })
          return
        }
        setGroups(data || [])
      })
  }, [selectedYear]) // eslint-disable-line

  // ── Cascade: Group → Sections ────────────────────────────────────────────
  useEffect(() => {
    setValue('section_id', '')
    setSections([])

    if (!selectedGroup) return

    setSectionsLoading(true)
    supabase
      .from('sections')
      .select('id, name')
      .eq('group_id', selectedGroup)
      .order('created_at')
      .then(({ data, error }) => {
        setSectionsLoading(false)
        if (error) {
          toast({ title: 'Failed to load sections', description: error.message, variant: 'error' })
          return
        }
        setSections(data || [])
      })
  }, [selectedGroup]) // eslint-disable-line

  // ── Submit ───────────────────────────────────────────────────────────────
  async function onSubmit(data: FormValues) {
    setSubmitting(true)
    try {
      const result = await createStudent(data)
      toast({
        title: 'Student enrolled successfully!',
        description: `${data.first_name} ${data.last_name} has been registered.`,
        variant: 'success',
      })
      setCredentials({ email: result.email, password: result.password })
      reset()
      setGroups([])
      setSections([])
    } catch (err: any) {
      toast({
        title: 'Enrollment failed',
        description: err.message,
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      {credentials && (
        <CredentialModal
          email={credentials.email}
          password={credentials.password}
          onClose={() => setCredentials(null)}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-6">

          {/* ── Section 1: Login Credentials ───────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader
              step="1"
              color="bg-slate-700"
              title="Portal Login Credentials"
              subtitle="Set the student's username and initial password for portal access"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label required>Username</Label>
                <div className="relative">
                  <input
                    {...register('username')}
                    placeholder="e.g. john.doe or CS2026001"
                    className={inputCls}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-mono hidden sm:inline">
                    @students.nexus.edu
                  </span>
                </div>
                <FieldError message={errors.username?.message} />
                <p className="text-xs text-slate-400 mt-1">Letters, numbers, dots and underscores only.</p>
              </div>
              <div>
                <Label required>Password</Label>
                <div className="relative">
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    className={inputCls + ' pr-10'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <FieldError message={errors.password?.message} />
              </div>
            </div>
          </div>

          {/* ── Section 2: Basic Information ────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader
              step="2"
              color="bg-blue-600"
              title="Basic Information"
              subtitle="Student's personal details"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label required>First Name</Label>
                <input {...register('first_name')} placeholder="e.g. John" className={inputCls} />
                <FieldError message={errors.first_name?.message} />
              </div>
              <div>
                <Label required>Last Name</Label>
                <input {...register('last_name')} placeholder="e.g. Doe" className={inputCls} />
                <FieldError message={errors.last_name?.message} />
              </div>
              <div>
                <Label required>Roll Number</Label>
                <input {...register('roll_no')} placeholder="e.g. CS-2026-001" className={inputCls} />
                <FieldError message={errors.roll_no?.message} />
              </div>
              <div>
                <Label required>Gender</Label>
                <select {...register('gender')} className={inputCls + ' bg-white'}>
                  <option value="">Select gender...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
                <FieldError message={errors.gender?.message} />
              </div>
              <div>
                <Label>Phone Number</Label>
                <input {...register('phone')} placeholder="+92 300 0000000" className={inputCls} />
              </div>
              <div className="md:col-span-2">
                <Label>Home Address</Label>
                <textarea
                  {...register('address')}
                  rows={2}
                  placeholder="Street, City, State, Postal Code"
                  className={inputCls + ' resize-none'}
                />
              </div>
            </div>
          </div>

          {/* ── Section 3: Academic Hierarchy (Cascading) ───────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader
              step="3"
              color="bg-indigo-600"
              title="Academic Assignment"
              subtitle="Select Year → Group → Section in order"
            />

            {/* Visual cascade indicator */}
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-5 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Dropdowns unlock progressively — select a Year to populate Groups, then a Group to populate Sections.
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Year */}
              <div>
                <Label required>Academic Year</Label>
                <div className="relative">
                  <select
                    {...register('year_id')}
                    className={inputCls + ' bg-white appearance-none pr-8'}
                  >
                    <option value="">Select Year...</option>
                    {years.map((y) => (
                      <option key={y.id} value={y.id}>{y.name}</option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <FieldError message={errors.year_id?.message} />
              </div>

              {/* Group */}
              <div>
                <Label required>Study Group</Label>
                <div className="relative">
                  {!selectedYear ? (
                    <div className={disabledSelectCls + 'flex items-center gap-2'}>
                      <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Select a Year first
                    </div>
                  ) : groupsLoading ? (
                    <div className={disabledSelectCls + 'flex items-center gap-2'}>
                      <svg className="animate-spin w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading groups...
                    </div>
                  ) : (
                    <>
                      <select
                        {...register('group_id')}
                        className={inputCls + ' bg-white appearance-none pr-8'}
                      >
                        <option value="">Select Group...</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </div>
                <FieldError message={errors.group_id?.message} />
              </div>

              {/* Section */}
              <div>
                <Label required>Section</Label>
                <div className="relative">
                  {!selectedGroup ? (
                    <div className={disabledSelectCls + 'flex items-center gap-2'}>
                      <svg className="w-3.5 h-3.5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Select a Group first
                    </div>
                  ) : sectionsLoading ? (
                    <div className={disabledSelectCls + 'flex items-center gap-2'}>
                      <svg className="animate-spin w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Loading sections...
                    </div>
                  ) : (
                    <>
                      <select
                        {...register('section_id')}
                        className={inputCls + ' bg-white appearance-none pr-8'}
                      >
                        <option value="">Select Section...</option>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </>
                  )}
                </div>
                <FieldError message={errors.section_id?.message} />
              </div>
            </div>
          </div>

          {/* ── Section 4: Guardian Info ────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <SectionHeader
              step="4"
              color="bg-violet-600"
              title="Guardian Information"
              subtitle="Primary guardian contact details"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <Label required>Guardian Full Name</Label>
                <input {...register('guardian_name')} placeholder="e.g. Mr. Ahmed Khan" className={inputCls} />
                <FieldError message={errors.guardian_name?.message} />
              </div>
              <div>
                <Label required>Guardian Mobile</Label>
                <input {...register('guardian_phone')} placeholder="+92 300 0000000" className={inputCls} />
                <FieldError message={errors.guardian_phone?.message} />
              </div>
            </div>
          </div>

          {/* ── Submit ─────────────────────────────────────────────── */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
            <p className="text-xs text-slate-400">
              All fields marked <span className="text-red-500">*</span> are required. Student login credentials will be shown once after submission.
            </p>
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-bold rounded-xl shadow-md shadow-blue-500/30 transition-all disabled:opacity-60 disabled:cursor-wait shrink-0"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Enrolling Student...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Complete Enrollment
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </>
  )
}
