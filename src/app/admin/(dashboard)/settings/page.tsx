'use client'

import { useState, useEffect, FormEvent } from 'react'

const AVATAR_EMOJIS = ['✍️','📚','🌿','☕','🎨','🧘','🌙','⭐','🦋','🌸','🏔️','🎵','📖','🌊','🍃']

export default function SettingsPage() {
  const [form, setForm] = useState({
    blog_name: '',
    author_name: '',
    bio: '',
    about_content: '',
    avatar: '✍️',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        setForm({
          blog_name: data.blog_name || '',
          author_name: data.author_name || '',
          bio: data.bio || '',
          about_content: data.about_content || '',
          avatar: data.avatar || '✍️',
        })
        setLoading(false)
      })
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setToast('设置已保存 ✓')
        setTimeout(() => setToast(''), 3000)
      } else {
        setToast('保存失败，请重试')
      }
    } catch {
      setToast('网络错误')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-20 text-[#9A9A96]">加载中...</div>

  return (
    <div className="max-w-2xl">
      <h1 className="font-serif text-2xl font-bold text-[#1A1A1A] mb-8">网站设置</h1>

      {toast && (
        <div className="mb-6 px-4 py-3 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">
          {toast}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic info */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-6 space-y-5">
          <h2 className="font-semibold text-[#1A1A1A] border-b border-[#F0F0EE] pb-3">基本信息</h2>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">博客名称</label>
            <input
              type="text"
              value={form.blog_name}
              onChange={(e) => setForm({ ...form, blog_name: e.target.value })}
              placeholder="Peter · 随笔"
              className="w-full px-4 py-2.5 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">博主名字</label>
            <input
              type="text"
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              placeholder="Peter"
              className="w-full px-4 py-2.5 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">一句话介绍</label>
            <input
              type="text"
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              placeholder="记录思考与生活"
              maxLength={80}
              className="w-full px-4 py-2.5 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>

          {/* Avatar picker */}
          <div>
            <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">
              头像（当前：<span className="text-xl">{form.avatar}</span>）
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm({ ...form, avatar: emoji })}
                  className={`w-10 h-10 text-xl rounded-lg border-2 transition-all ${
                    form.avatar === emoji
                      ? 'border-[#1A1A1A] bg-[#F5F5F3]'
                      : 'border-transparent hover:border-[#E5E5E3]'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* About page content */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-6">
          <h2 className="font-semibold text-[#1A1A1A] border-b border-[#F0F0EE] pb-3 mb-5">关于页面内容</h2>
          <p className="text-xs text-[#9A9A96] mb-3">支持 HTML 标签，例如 &lt;p&gt;、&lt;strong&gt;、&lt;a&gt; 等</p>
          <textarea
            value={form.about_content}
            onChange={(e) => setForm({ ...form, about_content: e.target.value })}
            placeholder="<p>你好，我是...</p>"
            rows={10}
            className="w-full px-4 py-3 border border-[#E5E5E3] rounded-lg text-sm outline-none focus:border-[#1A1A1A] transition-colors font-mono resize-y"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-[#1A1A1A] text-white rounded-lg font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存设置'}
        </button>
      </form>
    </div>
  )
}
