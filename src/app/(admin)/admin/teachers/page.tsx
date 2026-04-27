import { getTeachers } from '@/app/actions/teacher'
import TeacherTable from './_components/TeacherTable'

export const metadata = {
  title: 'Teacher Management — NexusCollege',
  description: 'View and manage all teacher accounts.',
}

export default async function TeachersPage() {
  const teachers = await getTeachers()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-teal-50/40 to-emerald-50/30">
      <div className="page-container">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center shadow-md shadow-teal-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Staff</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Teacher Management</h1>
          <p className="mt-1.5 text-slate-500 text-sm max-w-2xl">
            All user accounts with <strong className="text-slate-700">role: teacher</strong>. Removing a teacher resets their role to student.
          </p>
        </div>
        <TeacherTable initialTeachers={teachers} />
      </div>
    </div>
  )
}
