// 去掉 edge runtime，改用 Node.js serverless，配合 ISR 缓存效果更好
export const revalidate = 300

import Link from 'next/link'
import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { supabase } from '@/lib/supabase'
import { Post, PostSummary, SiteSettings } from '@/types'
import { PostCard } from '@/components/blog/PostCard'
import { FadeInSection } from '@/components/blog/FadeInSection'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { groupPostsByMonth } from '@/lib/utils'
import { PostCalendar } from '@/components/blog/PostCalendar'
import { PhDCounter } from '@/components/blog/PhDCounter'

const GRID_POSTS_PER_PAGE = 8
const HOME_FIRST_PAGE_POSTS = 9
const POST_SUMMARY_FIELDS = 'id, title, slug, excerpt, cover_image, category, tags, status, pinned, reading_time, created_at, updated_at'

export const metadata: Metadata = {
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/rss.xml',
    },
  },
}

// 生成分页页码序列：少于等于 7 页全展示；多于则首页/末页固定，中间显示 current ± 1，超出用省略号
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const result: (number | 'ellipsis')[] = [1]
  if (current > 3) result.push('ellipsis')
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) result.push(i)
  if (current < total - 2) result.push('ellipsis')
  result.push(total)
  return result
}

// 用 unstable_cache 包裹，让 Next.js 真正缓存 Supabase 查询结果
const getPosts = unstable_cache(
  async (page: number, category?: string, archive?: string, date?: string, tag?: string) => {
    const isBaseListing = !category && !archive && !date && !tag
    const isHomeFirstPage = isBaseListing && page === 1
    const pageSize = isHomeFirstPage ? HOME_FIRST_PAGE_POSTS : GRID_POSTS_PER_PAGE
    const from = isBaseListing && page > 1
      ? HOME_FIRST_PAGE_POSTS + (page - 2) * GRID_POSTS_PER_PAGE
      : (page - 1) * GRID_POSTS_PER_PAGE
    const to = from + pageSize - 1

    let query = supabase
      .from('posts')
      .select(POST_SUMMARY_FIELDS, { count: 'exact' })
      .eq('status', 'published')
      // 置顶优先；置顶之间按"被置顶时间"倒序（最新置顶的在最前）
      // 非置顶按发布时间倒序
      .order('pinned', { ascending: false })
      .order('pinned_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (category && category !== '全部') {
      query = query.eq('category', category)
    }

    if (tag) {
      query = query.contains('tags', [tag])
    }

    // 归档筛选: archive 格式为 "2026-04"
    if (archive && /^\d{4}-\d{2}$/.test(archive)) {
      const [y, m] = archive.split('-').map(Number)
      const start = new Date(y, m - 1, 1).toISOString()
      const end = new Date(y, m, 1).toISOString()
      query = query.gte('created_at', start).lt('created_at', end)
    }

    // 单日筛选: date 格式为 "2026-04-30"
    if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const [y, m, d] = date.split('-').map(Number)
      const start = new Date(y, m - 1, d).toISOString()
      const end = new Date(y, m - 1, d + 1).toISOString()
      query = query.gte('created_at', start).lt('created_at', end)
    }

    query = query.range(from, to)
    const { data, count } = await query
    return { posts: (data || []) as PostSummary[], total: count || 0 }
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
    const { data } = await supabase.from('site_settings').select('*').eq('id', 1).single()
    return data || {
      id: 1, blog_name: 'Peter · 随笔', author_name: 'Peter',
      bio: '记录思考与生活', about_content: '', avatar: '✍️', updated_at: '',
    }
  },
  ['site-settings'],
  { revalidate: 300 }
)

interface HomePageProps {
  searchParams: Promise<{ page?: string; category?: string; archive?: string; date?: string; tag?: string }>
}

// 把 "2026-04-30" 格式化为 "2026年4月30日"
function formatDateKey(dateKey: string) {
  const m = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return dateKey
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams
  const requestedPage = Number.parseInt(resolvedSearchParams.page || '1', 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const category = resolvedSearchParams.category || ''
  const archiveParam = resolvedSearchParams.archive || ''
  const dateParam = resolvedSearchParams.date || ''
  const tagParam = resolvedSearchParams.tag || ''

  const [{ posts, total }, allPosts, settings] = await Promise.all([
    getPosts(page, category, archiveParam, dateParam, tagParam),
    getAllPublishedPosts(),
    getSettings(),
  ])

  const isFiltered = !!category || !!archiveParam || !!dateParam || !!tagParam
  const totalPages = isFiltered
    ? Math.ceil(total / GRID_POSTS_PER_PAGE)
    : total <= HOME_FIRST_PAGE_POSTS
      ? 1
      : 1 + Math.ceil((total - HOME_FIRST_PAGE_POSTS) / GRID_POSTS_PER_PAGE)
  const heroPost = page === 1 && !isFiltered ? posts[0] : null
  const listPosts = page === 1 && !isFiltered ? posts.slice(1) : posts

  // Sidebar data
  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags || []))).slice(0, 30)
  const archive = groupPostsByMonth(allPosts)
  const filterLabel = tagParam
    ? `#${tagParam}`
    : category
      ? `「${category}」`
      : archiveParam
        ? archiveParam
        : dateParam
          ? formatDateKey(dateParam)
          : ''

  // 给每篇文章按发布时间正序编号 (第一篇=001)
  // allPosts 是 desc 排序，反转后第一个就是最早发布的
  const numberMap = new Map<string, number>()
  const sortedAsc = [...allPosts].reverse()
  sortedAsc.forEach((p, i) => numberMap.set(p.slug, i + 1))

  return (
    <>
      <Navbar blogName={settings.blog_name} />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          <div className="flex gap-12">
            {/* Main content */}
            <div className="flex-1 min-w-0">
              {category === '投资理财' && (
                <section className="motion-page-enter mb-8 rounded-[14px] border border-[#FED7AA] bg-gradient-to-br from-[#FFF7ED] to-white px-5 py-6 sm:px-7">
                  <p className="text-xs font-bold tracking-[0.18em] text-[#C06B24] uppercase">Daily Practice</p>
                  <h1 className="font-serif text-2xl font-bold text-[#1A1A1A] mt-2">投资理财实践</h1>
                  <p className="text-sm text-[#6A6A65] leading-relaxed mt-2 max-w-2xl">
                    记录每天真实执行的配置、交易、复盘与风险思考。这里是个人实践档案，不构成任何投资建议。
                  </p>
                </section>
              )}

              {/* 筛选状态提示 */}
              {dateParam && (
                <div className="mb-8 flex items-center justify-between bg-[#FFF8F0] border border-[#E8D4BB] rounded-[10px] px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-[#C09060]">📅</span>
                    <span className="text-[#5A5A55]">
                      正在查看 <strong className="text-[#1A1A1A]">{formatDateKey(dateParam)}</strong> 的文章
                      <span className="text-[#9A9A96] ml-2">共 {total} 篇</span>
                    </span>
                  </div>
                  <Link
                    href="/"
                    className="text-xs font-semibold text-[#C09060] hover:text-[#A07040] transition-colors px-3 py-1 rounded-md hover:bg-white"
                  >
                    清除筛选 ✕
                  </Link>
                </div>
              )}

              {/* Mobile explore */}
              {(allTags.length > 0 || Object.keys(archive).length > 0) && (
                <div className="lg:hidden mb-8 space-y-3">
                  {filterLabel && (
                    <div className="flex items-center justify-between bg-white border border-[#E5E5E3] rounded-[10px] px-4 py-3">
                      <span className="text-sm font-medium text-[#5A5A55]">当前筛选：{filterLabel}</span>
                      <Link href="/" className="text-xs font-semibold text-[#C09060] hover:underline">
                        清除
                      </Link>
                    </div>
                  )}
                  {allTags.length > 0 && (
                    <details className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[#1A1A1A]">标签</summary>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {allTags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/?tag=${encodeURIComponent(tag)}`}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                              tagParam === tag
                                ? 'bg-[#1A1A1A] text-white'
                                : 'bg-[#F5F5F3] text-[#5A5A55] hover:bg-[#1A1A1A] hover:text-white'
                            }`}
                          >
                            {tag}
                          </Link>
                        ))}
                      </div>
                    </details>
                  )}
                  {Object.keys(archive).length > 0 && (
                    <details className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-[#1A1A1A]">归档</summary>
                      <div className="grid grid-cols-2 gap-2 mt-3">
                        {Object.entries(archive).map(([month, monthPosts]) => {
                          const m = month.match(/^(\d{4})年(\d{1,2})月$/)
                          const archiveKey = m ? `${m[1]}-${String(m[2]).padStart(2, '0')}` : ''
                          const active = archiveParam === archiveKey
                          return (
                            <Link
                              key={month}
                              href={active ? '/' : `/?archive=${archiveKey}`}
                              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition-colors ${
                                active
                                  ? 'bg-[#1A1A1A] text-white'
                                  : 'bg-[#F5F5F3] text-[#5A5A55] hover:bg-[#ECECE8]'
                              }`}
                            >
                              <span className="font-medium">{month}</span>
                              <span className="text-xs opacity-70">{monthPosts.length}</span>
                            </Link>
                          )
                        })}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {/* Hero post */}
              {heroPost && (
                <div className="motion-page-enter mb-10">
                  <PostCard post={heroPost} featured postNumber={numberMap.get(heroPost.slug)} />
                </div>
              )}

              {/* Post grid */}
              {listPosts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {listPosts.map((post, i) => (
                    <FadeInSection key={post.id} delay={i * 80}>
                      <PostCard post={post} postNumber={numberMap.get(post.slug)} />
                    </FadeInSection>
                  ))}
                </div>
              ) : (
                !heroPost && (
                  <div className="text-center py-24 text-[#9A9A96]">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="font-medium">
                      {dateParam
                        ? `${formatDateKey(dateParam)} 没有文章`
                        : tagParam
                          ? `#${tagParam} 暂无文章`
                          : `「${category || '全部'}」暂无文章`}
                    </p>
                    {(category || dateParam || tagParam) && (
                      <Link href="/" className="inline-block mt-4 text-sm text-[#C09060] hover:underline">
                        ← 返回全部
                      </Link>
                    )}
                  </div>
                )
              )}

              {/* Pagination */}
              {totalPages > 1 && (() => {
                // 构造 URL：保留 category / archive / date，page=1 时省略 page 参数让 URL 更干净
                const buildUrl = (p: number) => {
                  const params = new URLSearchParams()
                  if (p > 1) params.set('page', String(p))
                  if (category) params.set('category', category)
                  if (archiveParam) params.set('archive', archiveParam)
                  if (dateParam) params.set('date', dateParam)
                  if (tagParam) params.set('tag', tagParam)
                  const qs = params.toString()
                  return qs ? `/?${qs}` : '/'
                }
                const pageItems = getPageNumbers(page, totalPages)
                return (
                  <nav aria-label="文章分页" className="flex justify-center gap-2 mt-12 flex-wrap">
                    {page > 1 && (
                      <Link
                        href={buildUrl(page - 1)}
                        rel="prev"
                        className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold hover:border-[#1A1A1A] transition-colors"
                      >
                        ← 上一页
                      </Link>
                    )}
                    {pageItems.map((item, idx) =>
                      item === 'ellipsis' ? (
                        <span
                          key={`ellipsis-${idx}`}
                          aria-hidden="true"
                          className="px-3 py-2 text-sm text-[#9A9A96] select-none"
                        >
                          …
                        </span>
                      ) : (
                        <Link
                          key={item}
                          href={buildUrl(item)}
                          aria-label={`第 ${item} 页`}
                          aria-current={item === page ? 'page' : undefined}
                          className={`px-4 py-2 border rounded-lg text-sm font-semibold transition-colors ${
                            item === page
                              ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]'
                              : 'border-[#E5E5E3] hover:border-[#1A1A1A]'
                          }`}
                        >
                          {item}
                        </Link>
                      )
                    )}
                    {page < totalPages && (
                      <Link
                        href={buildUrl(page + 1)}
                        rel="next"
                        className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold hover:border-[#1A1A1A] transition-colors"
                      >
                        下一页 →
                      </Link>
                    )}
                  </nav>
                )
              })()}
            </div>

            {/* Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              {/* Author card */}
              <div className="motion-page-enter motion-delay-1 bg-white border border-[#E5E5E3] rounded-[10px] p-6 mb-6 text-center">
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
                        href={`/?tag=${encodeURIComponent(tag)}`}
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
