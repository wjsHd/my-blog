import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase'
import { Post } from '@/types'
import { formatDate } from '@/lib/utils'

async function getStats() {
  const { data: posts } = await supabaseAdmin.from('posts').select('id, status, views, created_at')
  const all = posts || []
  const now = new Date()
  const thisMonth = all.filter((p) => {
    const d = new Date(p.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  return {
    total: all.length,
    published: all.filter((p) => p.status === 'published').length,
    draft: all.filter((p) => p.status === 'draft').length,
    monthNew: thisMonth.length,
    totalViews: all.reduce((sum, p) => sum + (p.views || 0), 0),
  }
}

async function getRecentPosts(): Promise<Post[]> {
  const { data } = await supabaseAdmin
    .from('posts')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(5)
  return (data || []) as Post[]
}

const STATUS_MAP = {
  published: { label: '已发布', cls: 'bg-green-50 text-green-600' },
  draft: { label: '草稿', cls: 'bg-yellow-50 text-yellow-600' },
}

export default async function AdminDashboard() {
  const [stats, recentPosts] = await Promise.all([getStats(), getRecentPosts()])

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif text-2xl font-bold text-[#1A1A1A]">控制台</h1>
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
        >
          + 写新文章
        </Link>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        {[
          { label: '文章总数', value: stats.total, icon: '📝' },
          { label: '已发布', value: stats.published, icon: '✅' },
          { label: '草稿', value: stats.draft, icon: '📋' },
          { label: '总阅读量', value: stats.totalViews, icon: '👁️' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-[#E5E5E3] rounded-[10px] p-5">
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-[#1A1A1A]">{stat.value}</div>
            <div className="text-xs text-[#9A9A96] font-medium mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Recent posts */}
      <div className="bg-white border border-[#E5E5E3] rounded-[10px] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
          <h2 className="font-semibold text-[#1A1A1A]">最近文章</h2>
          <Link href="/admin/posts" className="text-xs text-[#C09060] hover:underline font-semibold">
            查看全部 →
          </Link>
        </div>
        {recentPosts.length === 0 ? (
          <div className="text-center py-12 text-[#9A9A96]">
            <p className="text-2xl mb-2">📝</p>
            <p className="text-sm">还没有文章，去写第一篇吧</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#F9F9F7]">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider">标题</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider hidden sm:table-cell">分类</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider">状态</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider hidden md:table-cell">更新时间</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0F0EE]">
              {recentPosts.map((post) => {
                const status = STATUS_MAP[post.status] || STATUS_MAP.draft
                return (
                  <tr key={post.id} className="hover:bg-[#FAFAF9]">
                    <td className="px-6 py-4">
                      <p className="font-medium text-[#1A1A1A] line-clamp-1 text-sm">{post.title}</p>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <span className="text-xs text-[#6A6A65]">{post.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="text-xs text-[#9A9A96]">{formatDate(post.updated_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/admin/posts/${post.id}`}
                        className="text-xs font-semibold text-[#C09060] hover:underline"
                      >
                        编辑
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
