export const revalidate = 300

import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { unstable_cache } from 'next/cache'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import type { Post, SiteSettings } from '@/types'
import { assertSupabaseSuccess } from '@/lib/supabaseErrors'

export const metadata: Metadata = {
  title: '归档',
  description: '按时间浏览 Peter · 随笔的全部文章',
  alternates: {
    canonical: '/archive',
    types: { 'application/rss+xml': '/rss.xml' },
  },
  openGraph: {
    type: 'website',
    title: '归档 | Peter · 随笔',
    description: '按时间浏览 Peter · 随笔的全部文章',
    url: '/archive',
    siteName: 'Peter · 随笔',
    images: [{
      url: '/og.png',
      width: 1200,
      height: 630,
      alt: 'Peter · 随笔 — 记录工作、思考、生活与投资理财实践',
    }],
  },
}

type ArchivePost = Pick<Post, 'id' | 'title' | 'slug' | 'category' | 'tags' | 'created_at' | 'reading_time'>
const ARCHIVE_POSTS_PER_PAGE = 24

const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
    assertSupabaseSuccess(error, 'load archive settings')
    return data || {
      id: 1,
      blog_name: 'Peter · 随笔',
      author_name: 'Peter',
      bio: '记录思考与生活',
      about_content: '',
      avatar: '✍️',
      updated_at: '',
    }
  },
  ['site-settings-archive'],
  { revalidate: 300 }
)

const getArchivePosts = unstable_cache(
  async (page: number): Promise<{ posts: ArchivePost[]; total: number }> => {
    const from = (page - 1) * ARCHIVE_POSTS_PER_PAGE
    const to = from + ARCHIVE_POSTS_PER_PAGE - 1
    const { data, error, count } = await supabase
      .from('posts')
      .select('id, title, slug, category, tags, created_at, reading_time', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(from, to)
    assertSupabaseSuccess(error, 'load archive posts')
    return {
      posts: (data || []) as ArchivePost[],
      total: count || 0,
    }
  },
  ['archive-posts-page'],
  { revalidate: 300 }
)

function groupByYearMonth(posts: ArchivePost[]) {
  const groups = new Map<string, Map<string, ArchivePost[]>>()
  posts.forEach((post) => {
    const date = new Date(post.created_at)
    const year = String(date.getFullYear())
    const month = `${date.getMonth() + 1}月`
    if (!groups.has(year)) groups.set(year, new Map())
    const yearGroup = groups.get(year)!
    if (!yearGroup.has(month)) yearGroup.set(month, [])
    yearGroup.get(month)!.push(post)
  })
  return groups
}

interface ArchivePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function ArchivePage({ searchParams }: ArchivePageProps) {
  const resolvedSearchParams = await searchParams
  const requestedPage = Number.parseInt(resolvedSearchParams.page || '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const [settings, archiveResult] = await Promise.all([getSettings(), getArchivePosts(page)])
  const { posts, total } = archiveResult
  const totalPages = Math.max(1, Math.ceil(total / ARCHIVE_POSTS_PER_PAGE))

  if (total > 0 && page > totalPages) {
    redirect(totalPages === 1 ? '/archive' : `/archive?page=${totalPages}`)
  }

  const grouped = groupByYearMonth(posts)

  return (
    <>
      <Suspense fallback={null}>
        <Navbar blogName={settings.blog_name} />
      </Suspense>
      <main id="main-content" tabIndex={-1} className="blog-page min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <header className="home-intro motion-page-enter mb-10">
            <p className="section-kicker mb-3">Archive</p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#1A1A1A]">归档</h1>
            <p className="mt-4 text-sm sm:text-base text-[#6A6A65] leading-relaxed">
              共 {total} 篇文章，按发布时间倒序排列
              {totalPages > 1 && ` · 第 ${page} / ${totalPages} 页`}。
            </p>
          </header>

          {posts.length === 0 ? (
            <div className="rounded-[10px] border border-[#E5E5E3] bg-white p-8 text-center text-[#9A9A96]">
              暂无已发布文章
            </div>
          ) : (
            <div className="space-y-10">
              {Array.from(grouped.entries()).map(([year, monthMap]) => (
                <section key={year} className="relative">
                  <h2 className="font-serif text-2xl font-bold text-[#1A1A1A] mb-5">{year}</h2>
                  <div className="space-y-6 border-l border-[#E5E5E3] pl-5 sm:pl-8">
                    {Array.from(monthMap.entries()).map(([month, monthPosts]) => (
                      <div key={month} className="relative">
                        <span className="absolute -left-[29px] sm:-left-[41px] top-1 h-3 w-3 rounded-full bg-[#C09060] ring-4 ring-[#FAFAF9]" />
                        <div className="mb-3 flex items-baseline gap-2">
                          <h3 className="font-serif text-lg font-bold text-[#1A1A1A]">{month}</h3>
                          <span className="text-xs text-[#9A9A96]">{monthPosts.length} 篇</span>
                        </div>
                        <div className="archive-list divide-y divide-[#F0F0EE] rounded-[14px] border border-[#E5E5E3] bg-white overflow-hidden">
                          {monthPosts.map((post) => (
                            <Link
                              key={post.id}
                              href={`/posts/${post.slug}`}
                              data-testid="archive-post"
                              className="group block px-4 py-4 sm:px-5 transition-colors hover:bg-[#FFF8F0]"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="min-w-0">
                                  <p className="font-serif font-semibold text-[#1A1A1A] group-hover:text-[#C09060] transition-colors">
                                    {post.title}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#9A9A96]">
                                    <span>{formatDate(post.created_at)}</span>
                                    <span>·</span>
                                    <span>{post.category}</span>
                                    <span>·</span>
                                    <span>{post.reading_time} 分钟阅读</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 sm:pl-4">
                                  {post.tags && post.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 sm:justify-end">
                                    {post.tags.slice(0, 3).map((tag) => (
                                      <span
                                        key={tag}
                                        className="rounded-full bg-[#F5F5F3] px-2 py-0.5 text-xs font-semibold text-[#6A6A65]"
                                      >
                                        #{tag}
                                      </span>
                                    ))}
                                    </div>
                                  )}
                                  <span aria-hidden="true" className="hidden sm:block text-[#C09060] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-[opacity,transform]">→</span>
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="归档分页"
              data-testid="archive-pagination"
              className="mt-10 flex items-center justify-between gap-4 border-t border-[#E5E5E3] pt-6"
            >
              {page > 1 ? (
                <Link
                  href={page === 2 ? '/archive' : `/archive?page=${page - 1}`}
                  rel="prev"
                  className="rounded-lg border border-[#E5E5E3] bg-white px-4 py-2 text-sm font-semibold text-[#5A5A55] transition-colors hover:border-[#C09060] hover:text-[#C09060]"
                >
                  ← 上一页
                </Link>
              ) : (
                <span className="rounded-lg border border-[#E5E5E3] px-4 py-2 text-sm font-semibold text-[#B0B0AC]" aria-disabled="true">
                  ← 上一页
                </span>
              )}

              <span className="text-sm font-medium text-[#6A6A65]">
                第 {page} / {totalPages} 页
              </span>

              {page < totalPages ? (
                <Link
                  href={`/archive?page=${page + 1}`}
                  rel="next"
                  className="rounded-lg border border-[#E5E5E3] bg-white px-4 py-2 text-sm font-semibold text-[#5A5A55] transition-colors hover:border-[#C09060] hover:text-[#C09060]"
                >
                  下一页 →
                </Link>
              ) : (
                <span className="rounded-lg border border-[#E5E5E3] px-4 py-2 text-sm font-semibold text-[#B0B0AC]" aria-disabled="true">
                  下一页 →
                </span>
              )}
            </nav>
          )}
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
