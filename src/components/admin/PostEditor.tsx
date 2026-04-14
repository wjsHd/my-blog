'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Post } from '@/types'

const CATEGORIES = ['文章', '思考', '生活']

interface PostEditorProps {
  initialData?: Post
}

export function PostEditor({ initialData }: PostEditorProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialData?.title || '')
  const [category, setCategory] = useState(initialData?.category || '文章')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [coverImage, setCoverImage] = useState(initialData?.cover_image || '')
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || '')
  const [status, setStatus] = useState<'draft' | 'published'>(initialData?.status || 'draft')
  const [saving, setSaving] = useState(false)
  const [autoSaveMsg, setAutoSaveMsg] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContent = useRef('')
  const savedIdRef = useRef(initialData?.id || '')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
      }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: '开始写作...' }),
    ],
    content: initialData?.content || '',
    editorProps: {
      attributes: {
        class: 'prose-blog min-h-[400px] outline-none px-0',
      },
      handleDrop(view, event, _slice, moved) {
        if (!moved && event.dataTransfer?.files?.length) {
          const file = event.dataTransfer.files[0]
          if (file.type.startsWith('image/')) {
            event.preventDefault()
            uploadAndInsertImage(file)
            return true
          }
        }
        return false
      },
      handlePaste(_view, event) {
        const items = event.clipboardData?.items
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              const file = item.getAsFile()
              if (file) {
                event.preventDefault()
                uploadAndInsertImage(file)
                return true
              }
            }
          }
        }
        return false
      },
    },
  })

  async function uploadAndInsertImage(file: File) {
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('Upload failed')
      const { url } = await res.json()
      editor?.chain().focus().setImage({ src: url, alt: file.name }).run()
    } catch {
      alert('图片上传失败，请检查 Cloudinary 配置')
    }
  }

  async function handleImageToolbar() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (file) await uploadAndInsertImage(file)
    }
    input.click()
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const { url } = await res.json()
      setCoverImage(url)
    } catch {
      alert('封面上传失败')
    } finally {
      setCoverUploading(false)
    }
  }

  function addTag(value: string) {
    const trimmed = value.trim()
    if (trimmed && !tags.includes(trimmed) && tags.length < 10) {
      setTags([...tags, trimmed])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag))
  }

  const getPayload = useCallback((targetStatus?: 'draft' | 'published') => {
    const content = editor?.getHTML() || ''
    return {
      title,
      content,
      excerpt,
      cover_image: coverImage || null,
      category,
      tags,
      status: targetStatus ?? status,
    }
  }, [title, editor, excerpt, coverImage, category, tags, status])

  async function save(targetStatus?: 'draft' | 'published') {
    if (!title.trim()) { alert('请输入文章标题'); return }
    setSaving(true)

    try {
      const payload = getPayload(targetStatus)
      const isNew = !savedIdRef.current
      const url = isNew ? '/api/posts' : `/api/posts/${savedIdRef.current}`
      const method = isNew ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const data = await res.json()
        if (isNew) {
          savedIdRef.current = data.id
          // Update URL without full reload
          window.history.replaceState({}, '', `/admin/posts/${data.id}`)
        }
        if (targetStatus) {
          setStatus(targetStatus)
          router.push('/admin/posts')
        }
        lastSavedContent.current = payload.content
      } else {
        alert('保存失败')
      }
    } finally {
      setSaving(false)
    }
  }

  // Auto-save every 30s
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      const content = editor?.getHTML() || ''
      if (!title.trim() || content === lastSavedContent.current) return

      const payload = getPayload('draft')
      const isNew = !savedIdRef.current
      const url = isNew ? '/api/posts' : `/api/posts/${savedIdRef.current}`
      const method = isNew ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        if (isNew) {
          const data = await res.json()
          savedIdRef.current = data.id
          window.history.replaceState({}, '', `/admin/posts/${data.id}`)
        }
        lastSavedContent.current = content
        setAutoSaveMsg('已自动保存')
        setTimeout(() => setAutoSaveMsg(''), 2000)
      }
    }, 30000)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [editor, title, getPayload])

  const ToolbarBtn = ({
    onClick, active, title: t, children,
  }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      title={t}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded text-sm font-semibold transition-colors ${
        active ? 'bg-[#1A1A1A] text-white' : 'text-[#5A5A55] hover:bg-[#F5F5F3]'
      }`}
    >
      {children}
    </button>
  )

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* Left: Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题..."
          className="w-full font-serif text-3xl font-bold text-[#1A1A1A] bg-transparent outline-none placeholder-[#C0C0BB] mb-6 border-b border-[#E5E5E3] pb-4"
        />

        {/* Toolbar */}
        <div className="flex flex-wrap gap-1 mb-4 p-2 bg-white border border-[#E5E5E3] rounded-[10px]">
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="加粗"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="斜体"
          >
            <em>I</em>
          </ToolbarBtn>
          <div className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor?.isActive('heading', { level: 2 })}
            title="标题 H2"
          >
            H2
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor?.isActive('heading', { level: 3 })}
            title="标题 H3"
          >
            H3
          </ToolbarBtn>
          <div className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            active={editor?.isActive('blockquote')}
            title="引用"
          >
            ❝
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
            active={editor?.isActive('codeBlock')}
            title="代码块"
          >
            {'</>'}
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            active={editor?.isActive('bulletList')}
            title="无序列表"
          >
            ≡
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            active={editor?.isActive('orderedList')}
            title="有序列表"
          >
            1.
          </ToolbarBtn>
          <div className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn onClick={handleImageToolbar} title="插入图片">
            🖼️
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="分割线"
          >
            —
          </ToolbarBtn>
        </div>

        {/* Editor area */}
        <div className="flex-1 bg-white border border-[#E5E5E3] rounded-[10px] p-6">
          <EditorContent editor={editor} />
        </div>

        {/* Bottom bar */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#E5E5E3]">
          <div className="flex items-center gap-2">
            {autoSaveMsg && (
              <span className="text-xs text-green-500 font-semibold">{autoSaveMsg}</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => save('draft')}
              disabled={saving}
              className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold text-[#6A6A65] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中...' : '保存草稿'}
            </button>
            <button
              onClick={() => save('published')}
              disabled={saving}
              className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
            >
              {status === 'published' ? '更新发布' : '发布文章'}
            </button>
          </div>
        </div>
      </div>

      {/* Right: Settings panel */}
      <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
        {/* Category */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">分类</p>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  category === cat
                    ? 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F5F5F3] text-[#6A6A65] hover:bg-[#E8E8E5]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">标签</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 bg-[#F5F5F3] rounded-full text-xs font-semibold text-[#5A5A55]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-[#9A9A96] hover:text-red-500 font-bold leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            placeholder="输入后按 Enter 添加"
            className="w-full px-3 py-2 border border-[#E5E5E3] rounded-lg text-xs outline-none focus:border-[#1A1A1A] transition-colors"
          />
        </div>

        {/* Cover image */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">封面图</p>
          {coverImage ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="封面" className="w-full h-32 object-cover rounded-lg mb-2" />
              <button
                type="button"
                onClick={() => setCoverImage('')}
                className="text-xs text-red-400 hover:text-red-600 font-semibold"
              >
                删除封面
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#E5E5E3] rounded-lg cursor-pointer hover:border-[#C09060] transition-colors">
              <span className="text-2xl mb-1">🖼️</span>
              <span className="text-xs text-[#9A9A96] font-semibold">
                {coverUploading ? '上传中...' : '点击上传封面'}
              </span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverUpload}
                disabled={coverUploading}
              />
            </label>
          )}
        </div>

        {/* Excerpt */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">摘要</p>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="不填则自动截取正文前120字"
            rows={3}
            className="w-full px-3 py-2 border border-[#E5E5E3] rounded-lg text-xs outline-none focus:border-[#1A1A1A] transition-colors resize-none"
          />
        </div>

        {/* Status */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">发布状态</p>
          <div className="flex gap-2">
            {(['draft', 'published'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  status === s
                    ? s === 'published'
                      ? 'bg-green-500 text-white'
                      : 'bg-[#1A1A1A] text-white'
                    : 'bg-[#F5F5F3] text-[#6A6A65] hover:bg-[#E8E8E5]'
                }`}
              >
                {s === 'draft' ? '草稿' : '已发布'}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
