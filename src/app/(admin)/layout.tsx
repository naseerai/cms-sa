import AdminSidebar from '@/components/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="portal-shell">
      <AdminSidebar />
      <main className="portal-main">
        {children}
      </main>
    </div>
  )
}
