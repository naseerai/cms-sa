import YearSetup from './_components/YearSetup'
import GroupSetup from './_components/GroupSetup'
import SectionSetup from './_components/SectionSetup'

export default function SetupPage() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Academic Infrastructure Setup</h1>
        <p className="mt-2 text-slate-500 text-base">
          Define the hierarchy: create Years, then assign Groups to Years, and finally assign Sections to Groups.
        </p>
      </div>

      {/* Hierarchy indicator */}
      <div className="flex items-center gap-2 mb-10 text-sm text-slate-500 bg-white border border-slate-200 rounded-xl px-5 py-3.5 shadow-sm w-fit">
        <span className="inline-flex items-center gap-1.5 font-semibold text-blue-600">
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">1</span>
          Years
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-600">
          <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center">2</span>
          Groups
        </span>
        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="inline-flex items-center gap-1.5 font-semibold text-violet-600">
          <span className="w-6 h-6 rounded-full bg-violet-600 text-white text-xs flex items-center justify-center">3</span>
          Sections
        </span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <YearSetup />
        <GroupSetup />
        <SectionSetup />
      </div>
    </div>
  )
}
