import Link from 'next/link'

export function Footer({ blogName = 'Peter · 随笔' }: { blogName?: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer mt-20 border-t border-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <Link href="/" className="inline-flex items-center gap-2 font-serif text-lg font-bold text-primary hover:text-accent transition-colors">
              <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
              {blogName}
            </Link>
            <p className="mt-2 text-sm text-muted-light">记录工作、思考、生活与投资理财实践。</p>
          </div>
          <nav aria-label="页脚导航" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-muted">
            <Link href="/" className="hover:text-accent transition-colors">首页</Link>
            <Link href="/archive" className="hover:text-accent transition-colors">归档</Link>
            <Link href="/about" className="hover:text-accent transition-colors">关于</Link>
            <Link href="/rss.xml" className="hover:text-accent transition-colors">RSS</Link>
          </nav>
        </div>
        <div className="mt-7 pt-4 border-t border-border flex flex-col sm:flex-row justify-between gap-2 text-xs text-muted-light">
          <span>© {year} {blogName}</span>
          <span>持续记录，慢慢生长。</span>
        </div>
      </div>
    </footer>
  )
}
