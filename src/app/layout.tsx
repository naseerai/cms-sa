import type { Metadata } from 'next'
import QueryProvider from '@/providers/QueryProvider'
import AdminSidebar from '@/components/AdminSidebar'
import './globals.css'

export const metadata: Metadata = {
  title: 'NexusCollege ERP',
  description: 'College Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
