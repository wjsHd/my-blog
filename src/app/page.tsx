// 去掉 edge runtime，改用 Node.js serverless，配合 ISR 缓存效果更好
export const revalidate = 300

import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { Post, SiteSettings } from '@/types'
import { PostCard } from '@/components/blog/PostCard'
import { FadeInSection } from '@/components/blog/FadeInSection'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { formatDate, groupPostsByMonth } from '@/lib/utils'
import { PostCalendar } from '@/components/blog/PostCalendar'
import { PhDCounter } from '@/components/blog/PhDCounter'

const POSTS_PER_PAGE = 8

// 用 unstable_cache 包裹，让 Next.js 真正缓存 Supabase 查询结果
const getPosts = unstable_cache(
  async (page: number, category?: string, archive?: string) => {
    const from = (page - 1) * POSTS_PER_PAGE
    const to = from + POSTS_PER_PAGE - 1

    let query = supabase
      .from('posts')
      .select('*', { count: 'exact' })
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (category && category !== '全部') {
      query = query.eq('category', category)
    }

    // 归档筛选: archive 格式为 "2026-04"
    if (archive && /^\d{4}-\d{2}$/.test(archive)) {
      const [y, m] = archive.split('-').map(Number)
      const start = new Date(y, m - 1, 1).toISOString()
      const end = new Date(y, m, 1).toISOString()
      query = query.gte('created_at', start).lt('created_at', end)
    }

    query = query.range(from, to)
    const { data, count } = await query
    return { posts: (data || []) as Post[], total: count || 0 }
  },
  ['posts-list'],
  { revalidate: 300 }
)

const getAllPublishedPosts = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, category, tags, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
    return (data || []) as Pick<Post, 'id' | 'title' | 'slug' | 'category' | 'tags' | 'created_at'>[]
  },
  ['all-posts'],
  { revalidate: 300 }
)

const getSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const { data } = await supabaseAdmin.from('site_settings').select('*').eq('id', 1).single()
    return data || {
      id: 1, blog_name: 'Peter · 随笔', author_name: 'Peter',
      bio: '记录思考与生活', about_content: '', avatar: '✍️', updated_at: '',
    }
  },
  ['site-settings'],
  { revalidate: 300 }
)

interface HomePageProps {
  searchParams: { page?: string; category?: string; archive?: string }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = parseInt(searchParams.page || '1')
  const category = searchParams.category || ''
  const archiveParam = searchParams.archive || ''

  const [{ posts, total }, allPosts, settings] = await Promise.all([
    getPosts(page, category, archiveParam),
    getAllPublishedPosts(),
    getSettings(),
  ])

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)
  const isFiltered = !!category || !!archiveParam
  const heroPost = page === 1 && !isFiltered ? posts[0] : null
  const listPosts = page === 1 && !isFiltered ? posts.slice(1) : posts

  // Sidebar data
  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags || []))).slice(0, 30)
  const archive = groupPostsByMonth(allPosts)

  return (
    <>
      <Navbar blogName={settings.blog_name} />
      <main className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="flex gap-12">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Hero post */}
              {heroPost && (
                <div className="mb-10">
                  <PostCard post={heroPost} featured />
                </div>
              )}

              {/* Post grid */}
              {listPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {listPosts.map((post, i) => (
                    <FadeInSection key={post.id} delay={i * 80}>
                      <PostCard post={post} />
                    </FadeInSection>
                  ))}
                </div>
              ) : (
                !heroPost && (
                  <div className="text-center py-24 text-[#9A9A96]">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="font-medium">「{category || '全部'}」暂无文章</p>
                    {category && (
                      <Link href="/" className="inline-block mt-4 text-sm text-[#C09060] hover:underline">
                        ← 返回全部
                      </Link>
                    )}
                  </div>
                )
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-12">
                  {page > 1 && (
                    <Link
                      href={`/?page=${page - 1}${category ? `&category=${category}` : ''}`}
                      className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold hover:border-[#1A1A1A] transition-colors"
                    >
                      ← 上一页
                    </Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`/?page=${p}${category ? `&category=${category}` : ''}`}
                      className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                        p === page
                          ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                          : 'border-[#E5E5E3] hover:border-[#1A1A1A]'
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link
                      href={`/?page=${page + 1}${category ? `&category=${category}` : ''}`}
                      className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold hover:border-[#1A1A1A] transition-colors"
                    >
                      下一页 →
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              {/* Author card */}
              <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-6 mb-6 text-center">
                <div className="text-5xl mb-3">{settings.avatar}</div>
                <p className="font-serif font-bold text-lg text-[#1A1A1A]">{settings.author_name}</p>
                <p className="text-sm text-[#6A6A65] mt-2 leading-relaxed">{settings.bio}</p>
                <Link
                  href="/about"
                  className="inline-block mt-4 text-xs font-semibold text-[#C09060] hover:underline"
                >
                  了解更多 →
                </Link>
              </div>

              {/* Tag cloud */}
              {allTags.length > 0 && (
                <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-5 mb-6">
                  <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest mb-4">标签</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <Link
                        key={tag}
                        href={`/?search=${tag}`}
                        className="px-2.5 py-1 bg-[#F5F5F3] rounded-full text-xs font-semibold text-[#5A5A55] hover:bg-[#1A1A1A] hover:text-white transition-colors"
                      >
                        {tag}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Archive */}
              {Object.keys(archive).length > 0 && (
                <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-5">
                  <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest mb-4">归档</p>
                  <ul className="space-y-1">
                    {Object.entries(archive).map(([month, monthPosts]) => {
                      // month 格式: "2026年4月" → 转成 "2026-04" 用于 URL
                      const m = month.match(/^(\d{4})年(\d{1,2})月$/)
                      const archiveKey = m ? `${m[1]}-${String(m[2]).padStart(2, '0')}` : ''
                      const active = archiveParam === archiveKey
                      return (
                        <li key={month}>
                          <Link
                            href={active ? '/' : `/?archive=${archiveKey}`}
                            className={`flex justify-between items-center text-sm px-2 py-1.5 rounded-md transition-colors ${
                              active
                                ? 'bg-[#1A1A1A] text-white'
                                : 'text-[#5A5A55] hover:bg-[#F5F5F3]'
                            }`}
                          >
                            <span className="font-medium">{month}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              active
                                ? 'bg-white/20 text-white'
                                : 'bg-[#F5F5F3] text-[#9A9A96]'
                            }`}>
                              {monthPosts.length}
                            </span>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {/* Calendar */}
              <PostCalendar postDates={allPosts.map((p) => p.created_at)} />

              {/* PhD Counter */}
              <PhDCounter />
            </aside>
          </div>
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
