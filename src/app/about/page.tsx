export const revalidate = 3600
import { Metadata } from 'next'
import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { SiteSettings } from '@/types'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { sanitizeRichHtml } from '@/lib/sanitizeHtml'
import { assertSupabaseSuccess } from '@/lib/supabaseErrors'

export const metadata: Metadata = {
  title: '关于',
  alternates: {
    canonical: '/about',
    types: { 'application/rss+xml': '/rss.xml' },
  },
  openGraph: {
    type: 'website',
    title: '关于 | Peter · 随笔',
    description: '记录工作、思考、生活与投资理财实践',
    url: '/about',
    siteName: 'Peter · 随笔',
    images: [{
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'Peter · 随笔 — 记录工作、思考、生活与投资理财实践',
    }],
  },
}

async function getSettings(): Promise<SiteSettings> {
  const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
  assertSupabaseSuccess(error, 'load about settings')
  return data || {
    id: 1, blog_name: 'Peter · 随笔', author_name: 'Peter',
    bio: '记录思考与生活', about_content: '', avatar: '✍️', updated_at: '',
  }
}

export default async function AboutPage() {
  const settings = await getSettings()

  const defaultAbout = `
    <p>你好，我是 ${settings.author_name}。</p>
    <p>这是我的个人博客，记录思考、生活与成长。</p>
    <p>欢迎在这里停留，希望文字能给你带来一点共鸣。</p>
  `

  const safeAboutContent = sanitizeRichHtml(settings.about_content || defaultAbout)

  return (
    <>
      <Suspense fallback={null}>
        <Navbar blogName={settings.blog_name} />
      </Suspense>
      <main id="main-content" tabIndex={-1} className="blog-page min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14 sm:py-20">
          {/* Avatar & name */}
          <header className="motion-page-enter text-center mb-12 sm:mb-14">
            <p className="section-kicker mb-5">About Me</p>
            <div className="about-avatar mx-auto mb-6" aria-hidden="true">{settings.avatar}</div>
            <h1 className="text-balance font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] mb-3">
              {settings.author_name}
            </h1>
            <p className="text-[#6A6A65] text-lg">{settings.bio}</p>
          </header>

          {/* Divider */}
          <div className="w-12 h-0.5 bg-[#C09060] mx-auto mb-14" />

          {/* About content */}
          <div
            className="motion-page-enter motion-delay-1 prose-blog"
            dangerouslySetInnerHTML={{ __html: safeAboutContent }}
          />
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
