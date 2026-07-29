'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Post } from '@/types'
import { ImageCropModal } from './ImageCropModal'

const CATEGORIES = ['工作', '思考', '生活', '投资理财']
const INVESTMENT_TEMPLATE_PLACEHOLDERS = [
  '记录今天实际完成的投资理财行动。',
  '记录标的、金额、比例与执行理由。',
  '记录收益之外的风险、情绪与纪律执行情况。',
  '写下下一步可执行的小行动。',
]
type CropTarget = 'cover' | 'content'

interface PostEditorProps {
  initialData?: Post
}

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`px-2.5 py-1.5 rounded text-sm font-semibold transition-colors ${
        active ? 'bg-[#1A1A1A] text-white' : 'text-[#5A5A55] hover:bg-[#F5F5F3]'
      }`}
    >
      {children}
    </button>
  )
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
  const [pinned, setPinned] = useState<boolean>(initialData?.pinned || false)
  const [saving, setSaving] = useState(false)
  const [autoSaveMsg, setAutoSaveMsg] = useState('')
  const [coverUploading, setCoverUploading] = useState(false)
  const [contentImageUploading, setContentImageUploading] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropTarget, setCropTarget] = useState<CropTarget>('cover')

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedContent = useRef('')
  const savedIdRef = useRef(initialData?.id || '')
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

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
            beginContentImageCrop(file)
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
                beginContentImageCrop(file)
                return true
              }
            }
          }
        }
        return false
      },
    },
  })

  async function uploadToCloudinaryDirect(file: File): Promise<string> {
    // Get signature from server (small request, no file data)
    const sigRes = await fetch('/api/upload-signature')
    if (!sigRes.ok) throw new Error('获取签名失败，请重新登录')
    const { signature, timestamp, folder, api_key, cloud_name } = await sigRes.json()

    // Upload directly to Cloudinary from browser (bypasses Vercel 4.5MB limit)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', api_key)
    fd.append('timestamp', timestamp)
    fd.append('folder', folder)
    fd.append('signature', signature)

    // 视频走 /video/upload，图片走 /image/upload
    const isVideo = file.type.startsWith('video/')
    const resourceType = isVideo ? 'video' : 'image'

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud_name}/${resourceType}/upload`, {
      method: 'POST',
      body: fd,
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err?.error?.message || 'Cloudinary 上传失败')
    }
    const data = await res.json()
    return data.secure_url as string
  }

  function beginContentImageCrop(file: File) {
    const objectUrl = URL.createObjectURL(file)
    setCropTarget('content')
    setPendingFile(file)
    setCropSrc(objectUrl)
  }

  async function handleImageToolbar() {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (file) beginContentImageCrop(file)
    }
    input.click()
  }

  function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset so same file can be re-selected

    // 视频文件直接上传，不走裁剪
    if (file.type.startsWith('video/')) {
      // 视频体积提醒
      if (file.size > 20 * 1024 * 1024) {
        if (!confirm(`这个视频文件 ${(file.size / 1024 / 1024).toFixed(1)}MB 比较大，会影响加载速度。建议先压到 5MB 以内。是否继续上传？`)) {
          return
        }
      }
      ;(async () => {
        setCoverUploading(true)
        try {
          const url = await uploadToCloudinaryDirect(file)
          setCoverImage(url)
        } catch (err) {
          alert(`封面上传失败：${err instanceof Error ? err.message : '未知错误'}`)
        } finally {
          setCoverUploading(false)
        }
      })()
      return
    }

    // 图片走裁剪流程
    const objectUrl = URL.createObjectURL(file)
    setCropTarget('cover')
    setCropSrc(objectUrl)
    setPendingFile(file)
  }

  async function handleCropComplete(croppedBlob: Blob) {
    if (cropSrc) URL.revokeObjectURL(cropSrc)
    setCropSrc(null)
    const isContentImage = cropTarget === 'content'
    if (isContentImage) setContentImageUploading(true)
    else setCoverUploading(true)
    try {
      const file = new File(
        [croppedBlob],
        pendingFile?.name.replace(/\.[^.]+$/, '.jpg') || (isContentImage ? 'article-image.jpg' : 'cover.jpg'),
        { type: 'image/jpeg' }
      )
      const url = await uploadToCloudinaryDirect(file)
      if (isContentImage) {
        editor?.chain().focus().setImage({ src: url, alt: pendingFile?.name || '正文图片' }).run()
      } else {
        setCoverImage(url)
      }
    } catch (err) {
      alert(`${isContentImage ? '正文图片' : '封面'}上传失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      if (isContentImage) setContentImageUploading(false)
      else setCoverUploading(false)
      setPendingFile(null)
    }
  }

  function handleCropCancel() {
    setCropSrc(null)
    setPendingFile(null)
    if (cropSrc) URL.revokeObjectURL(cropSrc)
  }

  function applyInvestmentTemplate() {
    const hasContent = !!editor?.getText().trim()
    if (hasContent && !confirm('当前正文已有内容，是否替换为每日投资理财实践模板？')) return

    const date = new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replaceAll('/', '-')

    setCategory('投资理财')
    if (!title.trim()) setTitle(`投资理财实践 · ${date}`)
    editor?.commands.setContent(`
      <h2>今日行动</h2><p>记录今天实际完成的投资理财行动。</p>
      <h2>配置与交易记录</h2><p>记录标的、金额、比例与执行理由。</p>
      <h2>复盘与风险</h2><p>记录收益之外的风险、情绪与纪律执行情况。</p>
      <h2>明日计划</h2><p>写下下一步可执行的小行动。</p>
      <p><em>以上仅为个人实践记录，不构成投资建议。</em></p>
    `)
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
      pinned,
    }
  }, [title, editor, excerpt, coverImage, category, tags, status, pinned])

  const queuePersist = useCallback((payload: ReturnType<typeof getPayload>) => {
    const task = saveQueueRef.current.then(async () => {
      const isNew = !savedIdRef.current
      const url = isNew ? '/api/posts' : `/api/posts/${savedIdRef.current}`
      const method = isNew ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.error || '保存失败')
      }

      if (isNew) {
        savedIdRef.current = data.id
        window.history.replaceState({}, '', `/admin/posts/${data.id}`)
      }
      lastSavedContent.current = payload.content
    })

    saveQueueRef.current = task.catch(() => undefined)
    return task
  }, [])

  async function save(targetStatus?: 'draft' | 'published') {
    if (!title.trim()) { alert('请输入文章标题'); return }
    const payload = getPayload(targetStatus)
    if (
      targetStatus === 'published' &&
      INVESTMENT_TEMPLATE_PLACEHOLDERS.some((placeholder) => payload.content.includes(placeholder))
    ) {
      alert('正文仍包含投资理财模板提示语，请填写完成后再发布')
      return
    }

    setSaving(true)
    try {
      await queuePersist(payload)
      if (targetStatus) {
        setStatus(targetStatus)
        router.push('/admin/posts')
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  // Auto-save every 30s
  useEffect(() => {
    autoSaveTimer.current = setInterval(async () => {
      const content = editor?.getHTML() || ''
      if (!title.trim() || content === lastSavedContent.current) return

      try {
        await queuePersist(getPayload('draft'))
        setAutoSaveMsg('已自动保存')
        setTimeout(() => setAutoSaveMsg(''), 2000)
      } catch {
        setAutoSaveMsg('自动保存失败')
      }
    }, 30000)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [editor, title, getPayload, queuePersist])

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
        aspectRatio={cropTarget === 'cover' ? 16 / 9 : 4 / 3}
        title={cropTarget === 'cover' ? '裁剪封面图' : '裁剪正文图片'}
      />
    )}
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
          <ToolbarBtn onClick={handleImageToolbar} title="裁剪并插入正文图片">
            {contentImageUploading ? '上传中…' : '🖼️ 裁剪插图'}
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
          {category === '投资理财' && (
            <button
              type="button"
              onClick={applyInvestmentTemplate}
              className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-semibold text-[#9A5B20] bg-[#FFF7ED] border border-[#FED7AA] hover:bg-[#FFEDD5] transition-colors"
            >
              插入每日实践模板
            </button>
          )}
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

        {/* Cover image / video */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">封面（图片或动图）</p>
          {coverImage ? (
            <div className="relative">
              {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(coverImage) || coverImage.includes('/video/upload/') ? (
                <video
                  src={coverImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverImage} alt="封面" className="w-full h-32 object-cover rounded-lg mb-2" />
              )}
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
              <span className="text-2xl mb-1">🎬</span>
              <span className="text-xs text-[#9A9A96] font-semibold">
                {coverUploading ? '上传中...' : '点击上传图片或动图'}
              </span>
              <span className="text-[10px] text-[#C0C0BB] mt-1">支持 jpg/png/mp4/webm</span>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm,video/quicktime"
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

        {/* Pin to top */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <button
            type="button"
            onClick={() => setPinned(!pinned)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">{pinned ? '📌' : '📍'}</span>
              <span className="text-sm font-semibold text-[#1A1A1A]">
                {pinned ? '已置顶' : '置顶到首页'}
              </span>
            </div>
            <div
              className={`relative w-10 h-5 rounded-full transition-colors ${
                pinned ? 'bg-[#C09060]' : 'bg-[#E5E5E3]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  pinned ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </div>
          </button>
          {pinned && (
            <p className="text-[10px] text-[#9A9A96] mt-2 leading-relaxed">
              置顶文章显示在最前面。最多 3 篇置顶，<br />超过时会自动取消最早被置顶的那篇。
            </p>
          )}
        </div>
      </aside>
    </div>
    </>
  )
}
