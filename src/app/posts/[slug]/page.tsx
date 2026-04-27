export const revalidate = 3600
// 允许构建后访问新文章时按需生成
export const dynamicParams = true

import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { Post, SiteSettings } from '@/types'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { TableOfContents } from '@/components/blog/TableOfContents'
import { PostCalendar } from '@/components/blog/PostCalendar'
import { PhDCounter } from '@/components/blog/PhDCounter'
import { formatDate } from '@/lib/utils'
import { ArticleContent } from '@/components/blog/ArticleContent'
import { ReadingProgress } from '@/components/blog/ReadingProgress'
import { ImageLightbox } from '@/components/blog/ImageLightbox'

const getAllPostDates = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('posts')
      .select('created_at')
      .eq('status', 'published')
    return (data || []).map((p: { created_at: string }) => p.created_at)
  },
  ['all-post-dates'],
  { revalidate: 300 }
)

async function getPost(slug: string): Promise<Post | null> {
  const { data } = await supabase
    .from('posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()
  return data || null
}

async function getAdjacentPosts(createdAt: string) {
  const [{ data: prev }, { data: next }] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, slug')
      .eq('status', 'published')
      .lt('created_at', createdAt)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('posts')
      .select('id, title, slug')
      .eq('status', 'published')
      .gt('created_at', createdAt)
      .order('created_at', { ascending: true })
      .limit(1)
      .single(),
  ])
  return { prev: prev || null, next: next || null }
}

async function getSettings(): Promise<SiteSettings> {
  const { data } = await supabaseAdmin.from('site_settings').select('*').eq('id', 1).single()
  return data || {
    id: 1, blog_name: 'Peter · 随笔', author_name: 'Peter',
    bio: '记录思考与生活', about_content: '', avatar: '✍️', updated_at: '',
  }
}

// 构建时预生成所有已发布文章的静态页面，访问时秒开
export async function generateStaticParams() {
  const { data } = await supabase
    .from('posts')
    .select('slug')
    .eq('status', 'published')
  return (data || []).map((p: { slug: string }) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug)
  if (!post) return { title: '文章不存在' }
  return {
    title: post.title,
    description: post.excerpt || '',
    openGraph: {
      title: post.title,
      description: post.excerpt || '',
      images: post.cover_image ? [post.cover_image] : [],
    },
  }
}

const CATEGORY_COLORS: Record<string, string> = {
  '文章': 'bg-blue-50 text-blue-600',
  '思考': 'bg-purple-50 text-purple-600',
  '生活': 'bg-green-50 text-green-600',
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()

  const [{ prev, next }, settings, postDates] = await Promise.all([
    getAdjacentPosts(post.created_at),
    getSettings(),
    getAllPostDates(),
  ])

  const catColor = CATEGORY_COLORS[post.category] || 'bg-amber-50 text-amber-600'

  return (
    <>
      <ReadingProgress />
      <ImageLightbox />
      <Navbar blogName={settings.blog_name} />
      <main className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex gap-16">
            {/* Article */}
            <article className="flex-1 min-w-0 max-w-2xl">
              {/* Header */}
              <header className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${catColor}`}>
                    {post.category}
                  </span>
                  {post.tags && post.tags.map((tag) => (
                    <span key={tag} className="text-xs text-[#9A9A96] font-medium">#{tag}</span>
                  ))}
                </div>
                <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A] leading-snug mb-6">
                  {post.title}
                </h1>
                <div className="flex items-center gap-4 text-sm text-[#9A9A96] pb-8 border-b border-[#E5E5E3]">
                  <span>{formatDate(post.created_at)}</span>
                  <span>·</span>
                  <span>{post.reading_time} 分钟阅读</span>
                  <span>·</span>
                  <span>{post.views || 0} 次阅读</span>
                </div>
              </header>

              {/* Cover image */}
              {post.cover_image && (
                <div className="relative w-full h-64 sm:h-96 rounded-[10px] overflow-hidden mb-10">
                  <Image
                    src={post.cover_image}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 672px"
                    priority
                  />
                </div>
              )}

              {/* Content */}
              <ArticleContent content={post.content} />

              {/* Prev / Next */}
              <nav className="mt-16 pt-8 border-t border-[#E5E5E3] grid grid-cols-2 gap-6">
                <div>
                  {prev && (
                    <Link href={`/posts/${prev.slug}`} className="group block">
                      <p className="text-xs text-[#9A9A96] font-semibold uppercase tracking-wider mb-2">← 上一篇</p>
                      <p className="font-serif font-semibold text-[#1A1A1A] group-hover:text-[#C09060] transition-colors line-clamp-2">
                        {prev.title}
                      </p>
                    </Link>
                  )}
                </div>
                <div className="text-right">
                  {next && (
                    <Link href={`/posts/${next.slug}`} className="group block">
                      <p className="text-xs text-[#9A9A96] font-semibold uppercase tracking-wider mb-2">下一篇 →</p>
                      <p className="font-serif font-semibold text-[#1A1A1A] group-hover:text-[#C09060] transition-colors line-clamp-2">
                        {next.title}
                      </p>
                    </Link>
                  )}
                </div>
              </nav>
            </article>

            {/* Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <TableOfContents content={post.content} />
              <div className="mt-6">
                <PostCalendar postDates={postDates} />
              </div>
              <PhDCounter />
            </aside>
          </div>
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
