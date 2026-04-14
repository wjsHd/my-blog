import { Metadata } from 'next'
import { supabaseAdmin } from '@/lib/supabase'
import { SiteSettings } from '@/types'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'

export const metadata: Metadata = { title: '关于' }

async function getSettings(): Promise<SiteSettings> {
  const { data } = await supabaseAdmin.from('site_settings').select('*').eq('id', 1).single()
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

  return (
    <>
      <Navbar blogName={settings.blog_name} />
      <main className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-20">
          {/* Avatar & name */}
          <div className="text-center mb-14">
            <div className="text-7xl mb-5">{settings.avatar}</div>
            <h1 className="font-serif text-3xl font-bold text-[#1A1A1A] mb-3">
              {settings.author_name}
            </h1>
            <p className="text-[#6A6A65] text-lg">{settings.bio}</p>
          </div>

          {/* Divider */}
          <div className="w-12 h-0.5 bg-[#C09060] mx-auto mb-14" />

          {/* About content */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{
              __html: settings.about_content || defaultAbout,
            }}
          />
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
