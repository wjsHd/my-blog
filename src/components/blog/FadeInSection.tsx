import type { ReactNode } from 'react'

export function FadeInSection({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div
      style={{ animationDelay: `${Math.min(delay, 320)}ms` }}
      className="motion-card-enter h-full"
    >
      {children}
    </div>
  )
}
