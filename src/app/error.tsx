'use client'

import Link from 'next/link'

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="max-w-lg">
        <p className="mb-4 font-mono text-sm font-bold tracking-[0.28em] text-accent">ERROR</p>
        <h1 className="font-serif text-4xl font-bold text-primary sm:text-5xl">页面暂时没有响应</h1>
        <p className="mx-auto mt-5 max-w-md leading-7 text-muted">
          可能是一次短暂的网络或服务异常。你可以重新尝试，也可以先回到首页。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="pressable rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            重新尝试
          </button>
          <Link href="/" className="pressable rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary hover:bg-surface-hover">
            返回首页
          </Link>
        </div>
      </div>
    </main>
  )
}
