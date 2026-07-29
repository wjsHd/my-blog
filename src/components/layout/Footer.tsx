import Link from 'next/link'

export function Footer({ blogName = 'Peter · 随笔' }: { blogName?: string }) {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border mt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-light">
          <span className="font-medium text-muted">{blogName}</span>
          <div className="flex items-center gap-2">
            <Link href="/rss.xml" className="hover:text-[#C09060] transition-colors">
              RSS 订阅
            </Link>
            <span className="text-border">·</span>
            <span>© {year}</span>
            <span className="text-border">·</span>
            <span>Powered by Next.js &amp; Supabase</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
