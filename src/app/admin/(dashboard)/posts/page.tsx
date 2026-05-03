'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Post } from '@/types'
import { formatDate } from '@/lib/utils'

const STATUS_MAP = {
  published: { label: '已发布', cls: 'bg-green-50 text-green-600' },
  draft: { label: '草稿', cls: 'bg-yellow-50 text-yellow-600' },
}

const CATEGORIES = ['全部', '工作', '思考', '生活']

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const limit = 15

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(search && { search }),
      ...(category !== '全部' && { category }),
      ...(statusFilter && { status: statusFilter }),
    })
    const res = await fetch(`/api/posts?${params}`)
    if (res.ok) {
      const data = await res.json()
      setPosts(data.posts)
      setTotal(data.total)
    }
    setLoading(false)
  }, [page, search, category, statusFilter])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  async function deletePost(id: string, title: string) {
    if (!confirm(`确定要删除《${title}》吗？此操作不可撤销。`)) return
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' })
    if (res.ok) fetchPosts()
  }

  async function toggleStatus(post: Post) {
    const newStatus = post.status === 'published' ? 'draft' : 'published'
    const res = await fetch(`/api/posts/${post.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) fetchPosts()
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-bold text-[#1A1A1A]">文章管理</h1>
        <Link
          href="/admin/posts/new"
          className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors"
        >
          + 写新文章
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4 mb-6 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="搜索文章标题..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="flex-1 min-w-48 px-3 py-2 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] transition-colors"
        />
        <div className="flex gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { setCategory(cat); setPage(1) }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                category === cat ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F5F3] text-[#6A6A65] hover:bg-[#E8E8E5]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] bg-white"
        >
          <option value="">全部状态</option>
          <option value="published">已发布</option>
          <option value="draft">草稿</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E5E5E3] rounded-[10px] overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-[#9A9A96]">
            <p className="text-2xl mb-2">⏳</p>
            <p className="text-sm">加载中...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-[#9A9A96]">
            <p className="text-2xl mb-2">📭</p>
            <p className="text-sm">没有找到文章</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-[#F9F9F7]">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider">标题</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider hidden sm:table-cell">分类</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider">状态</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-[#9A9A96] uppercase tracking-wider hidden md:table-cell">发布时间</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[#9A9A96] uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0EE]">
                {posts.map((post) => {
                  const status = STATUS_MAP[post.status] || STATUS_MAP.draft
                  return (
                    <tr key={post.id} className="hover:bg-[#FAFAF9]">
                      <td className="px-6 py-4">
                        <p className="font-medium text-sm text-[#1A1A1A] line-clamp-1">{post.title}</p>
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
                        <span className="text-xs text-[#9A9A96]">{formatDate(post.created_at)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/posts/${post.id}`}
                            className="text-xs font-semibold text-[#C09060] hover:underline"
                          >
                            编辑
                          </Link>
                          <button
                            onClick={() => toggleStatus(post)}
                            className="text-xs font-semibold text-[#6A6A65] hover:text-[#1A1A1A]"
                          >
                            {post.status === 'published' ? '下线' : '发布'}
                          </button>
                          <button
                            onClick={() => deletePost(post.id, post.title)}
                            className="text-xs font-semibold text-red-400 hover:text-red-600"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-[#F0F0EE] flex items-center justify-between">
                <p className="text-xs text-[#9A9A96]">共 {total} 篇</p>
                <div className="flex gap-1.5">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                        p === page ? 'bg-[#1A1A1A] text-white' : 'bg-[#F5F5F3] text-[#6A6A65] hover:bg-[#E8E8E5]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
