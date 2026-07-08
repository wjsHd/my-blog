import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

// Top-level admin layout: auth is handled by middleware.ts.
// Login page renders directly; all other /admin/* routes get AdminNav via (dashboard)/layout.tsx.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
