import Link from 'next/link'
import { supabase, supabaseAdmin } from '@/lib/supabase'
import { Post, SiteSettings } from '@/types'
import { PostCard } from '@/components/blog/PostCard'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { formatDate, groupPostsByMonth } from '@/lib/utils'

const POSTS_PER_PAGE = 8

async function getPosts(page: number, category?: string) {
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

  query = query.range(from, to)
  const { data, count } = await query
  return { posts: (data || []) as Post[], total: count || 0 }
}

async function getAllPublishedPosts() {
  const { data } = await supabase
    .from('posts')
    .select('id, title, slug, category, tags, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
  return (data || []) as Pick<Post, 'id' | 'title' | 'slug' | 'category' | 'tags' | 'created_at'>[]
}

async function getSettings(): Promise<SiteSettings> {
  const { data } = await supabaseAdmin.from('site_settings').select('*').eq('id', 1).single()
  return data || {
    id: 1, blog_name: 'Peter · 随笔', author_name: 'Peter',
    bio: '记录思考与生活', about_content: '', avatar: '✍️', updated_at: '',
  }
}

interface HomePageProps {
  searchParams: { page?: string; category?: string }
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const page = parseInt(searchParams.page || '1')
  const category = searchParams.category || ''

  const [{ posts, total }, allPosts, settings] = await Promise.all([
    getPosts(page, category),
    getAllPublishedPosts(),
    getSettings(),
  ])

  const totalPages = Math.ceil(total / POSTS_PER_PAGE)
  const heroPost = page === 1 && !category ? posts[0] : null
  const listPosts = page === 1 && !category ? posts.slice(1) : posts

  // Sidebar data
  const allTags = Array.from(new Set(allPosts.flatMap((p) => p.tags || []))).slice(0, 30)
  const archive = groupPostsByMonth(allPosts)
  const categories = ['全部', '文章', '思考', '生活']

  return (
    <>
      <Navbar blogName={settings.blog_name} />
      <main className="min-h-screen bg-[#FAFAF9]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

          {/* Category tabs */}
          <div className="flex gap-2 mb-10 border-b border-[#E5E5E3] pb-4">
            {categories.map((cat) => {
              const active = (!category && cat === '全部') || category === cat
              return (
                <Link
                  key={cat}
                  href={cat === '全部' ? '/' : `/?category=${cat}`}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-[#1A1A1A] text-white'
                      : 'text-[#6A6A65] hover:text-[#1A1A1A]'
                  }`}
                >
                  {cat}
                </Link>
              )
            })}
          </div>

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
                  {listPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                !heroPost && (
                  <div className="text-center py-24 text-[#9A9A96]">
                    <p className="text-4xl mb-4">📝</p>
                    <p className="font-medium">暂无文章</p>
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
                  <ul className="space-y-2">
                    {Object.entries(archive).map(([month, monthPosts]) => (
                      <li key={month} className="flex justify-between items-center text-sm">
                        <span className="text-[#5A5A55] font-medium">{month}</span>
                        <span className="text-xs bg-[#F5F5F3] text-[#9A9A96] px-2 py-0.5 rounded-full">
                          {monthPosts.length}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
      <Footer blogName={settings.blog_name} />
    </>
  )
}
