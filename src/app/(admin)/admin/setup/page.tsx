import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import RegulationSetup from './_components/RegulationSetup'
import GroupSetup from './_components/GroupSetup'
import SectionSetup from './_components/SectionSetup'

export const metadata = {
  title: 'Academic Infrastructure Setup — NexusCollege',
  description:
    'Configure the curriculum hierarchy: create Regulations, assign Groups, and add Sections.',
}

export default async function SetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role === 'teacher') redirect('/admin')

  return (
    <div className="page-container">
      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          {/* Hierarchy breadcrumb pill */}
          <div className="flex items-center gap-1.5 text-xs font-medium bg-white border border-slate-200 rounded-full px-4 py-1.5 shadow-sm text-slate-500">
            <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">1</span>
            <span className="text-blue-600 font-semibold">Regulations</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9px] flex items-center justify-center font-bold">2</span>
            <span className="text-indigo-600 font-semibold">Groups</span>
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
            <span className="w-4 h-4 rounded-full bg-violet-600 text-white text-[9px] flex items-center justify-center font-bold">3</span>
            <span className="text-violet-600 font-semibold">Sections</span>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Academic Infrastructure Setup
        </h1>
        <p className="mt-1.5 text-slate-500 text-sm max-w-2xl">
          Build your curriculum hierarchy manually. Start by defining a <strong className="text-slate-700">Regulation</strong>, then add <strong className="text-slate-700">Groups</strong> (departments) to it, and finally create <strong className="text-slate-700">Sections</strong> within each group.
        </p>
      </div>

      {/* ── 3-Column Setup Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <RegulationSetup />
        <GroupSetup />
        <SectionSetup />
      </div>
    </div>
  )
}
