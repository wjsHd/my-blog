import Link from 'next/link'

export default function NotFound() {
  return (
    <main id="main-content" tabIndex={-1} className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <div className="motion-page-enter max-w-lg">
        <p className="mb-4 font-mono text-sm font-bold tracking-[0.28em] text-accent">404</p>
        <h1 className="font-serif text-4xl font-bold text-primary sm:text-5xl">这页走丢了</h1>
        <p className="mx-auto mt-5 max-w-md leading-7 text-muted">
          链接可能已经变化，或者这篇文章尚未发布。你可以回到首页继续阅读。
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="pressable rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:opacity-90">
            返回首页
          </Link>
          <Link href="/archive" className="pressable rounded-lg border border-border bg-surface px-5 py-2.5 text-sm font-medium text-primary hover:bg-surface-hover">
            查看归档
          </Link>
        </div>
      </div>
    </main>
  )
}
