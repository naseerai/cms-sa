import NoticeBoard from './_components/NoticeBoard'

export const metadata = {
  title: 'Notice Board — NexusCollege',
  description: 'Post and manage notices for all students.',
}

export default function NoticesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-amber-50/40 to-orange-50/30">
      <div className="page-container">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-md shadow-amber-500/30">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Communication</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Notice Board</h1>
          <p className="mt-1.5 text-slate-500 text-sm max-w-2xl">
            Post announcements that appear instantly on every student's dashboard.
          </p>
        </div>
        <NoticeBoard />
      </div>
    </div>
  )
}
