export default function AdminDashboard() {
  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Dashboard</h1>
        <p className="mt-2 text-slate-500 text-base">Welcome to the NexusCollege Admin Panel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          {
            label: 'Academic Setup',
            desc: 'Define Regulations, Groups, and Sections.',
            href: '/admin/setup',
            color: 'from-blue-500 to-indigo-600',
            icon: (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            ),
          },
          {
            label: 'Student Management',
            desc: 'Onboard students and manage enrollment.',
            href: '/admin/students',
            color: 'from-emerald-500 to-teal-600',
            icon: (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ),
          },
          {
            label: 'Onboard Student',
            desc: 'Create student accounts and credentials.',
            href: '/admin/students/create',
            color: 'from-violet-500 to-purple-600',
            icon: (
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            ),
          },
        ].map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="block rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
          >
            <div className={`bg-gradient-to-r ${card.color} p-5`}>
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                {card.icon}
              </div>
            </div>
            <div className="p-5">
              <h2 className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{card.label}</h2>
              <p className="text-sm text-slate-500 mt-1">{card.desc}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
