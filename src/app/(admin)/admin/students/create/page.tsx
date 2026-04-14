import StudentForm from '../_components/StudentForm'
import Link from 'next/link'

export default function CreateStudentPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-10">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
              <Link href="/admin/students" className="hover:text-blue-600 transition-colors">
                Student Management
              </Link>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-800 font-medium">Enroll New Student</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Onboarding
            </h1>
            <p className="mt-2 text-slate-500 text-base max-w-xl">
              Complete all four sections to register a student, assign their academic context, and generate secure portal login credentials.
            </p>
          </div>
        </div>

        <StudentForm />
      </div>
    </div>
  )
}
