'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import ImageExtension from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'
import { Post } from '@/types'
import { ImageCropModal } from './ImageCropModal'
import { hasInvestmentTemplatePlaceholders } from '@/lib/investmentTemplate'
import { MotionVideo } from '@/components/blog/MotionVideo'
import { PostPreviewModal } from './PostPreviewModal'
import { hasMeaningfulPostContent } from '@/lib/postContent'

const CATEGORIES = ['工作', '思考', '生活', '投资理财']
const DEFAULT_CATEGORY = '工作'
const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const LOCAL_DRAFT_PREFIX = 'blog_admin_draft_v1'
const CONTENT_ASPECT_OPTIONS: Array<{ label: string; value: number | 'original' }> = [
  { label: '原图', value: 'original' },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '1:1', value: 1 },
]
type CropTarget = 'cover' | 'content'

interface PostDraftPayload {
  title: string
  content: string
  excerpt: string
  cover_image: string | null
  category: string
  tags: string[]
  status: 'draft' | 'published'
  pinned: boolean
}

interface LocalDraftRecord {
  savedAt: string
  payload: PostDraftPayload
}

function isLocalDraftRecord(value: unknown): value is LocalDraftRecord {
  if (!value || typeof value !== 'object') return false
  const record = value as Partial<LocalDraftRecord>
  const payload = record.payload as Partial<PostDraftPayload> | undefined
  return !!record.savedAt
    && typeof record.savedAt === 'string'
    && !!payload
    && typeof payload.title === 'string'
    && typeof payload.content === 'string'
    && typeof payload.excerpt === 'string'
    && (typeof payload.cover_image === 'string' || payload.cover_image === null)
    && typeof payload.category === 'string'
    && Array.isArray(payload.tags)
    && (payload.status === 'draft' || payload.status === 'published')
    && typeof payload.pinned === 'boolean'
}

interface PostEditorProps {
  initialData?: Post
}

function ToolbarBtn({
  onClick,
  active,
  title,
  shortcut,
  disabled,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  shortcut?: string
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={shortcut ? `${title}（${shortcut.replaceAll('Meta', 'Cmd').replaceAll('Control', 'Ctrl')}）` : title}
      aria-keyshortcuts={shortcut}
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1.5 rounded text-sm font-semibold transition-colors ${
        active ? 'bg-[#1A1A1A] text-white' : 'text-[#5A5A55] hover:bg-[#F5F5F3]'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )
}

export function PostEditor({ initialData }: PostEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [category, setCategory] = useState(
    initialData?.category && CATEGORIES.includes(initialData.category) ? initialData.category : DEFAULT_CATEGORY
  )
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
  const [contentLength, setContentLength] = useState(0)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [cropTarget, setCropTarget] = useState<CropTarget>('cover')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [recoveryDraft, setRecoveryDraft] = useState<LocalDraftRecord | null>(null)
  const [recoveryChecked, setRecoveryChecked] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveNotice, setSaveNotice] = useState('')
  const [lastPublishedSlug, setLastPublishedSlug] = useState(initialData?.status === 'published' ? initialData.slug : '')
  const [contentRevision, setContentRevision] = useState(0)

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const lastSavedSnapshot = useRef(JSON.stringify({
    title: initialData?.title || '',
    content: initialData?.content || '',
    excerpt: initialData?.excerpt || '',
    cover_image: initialData?.cover_image || null,
    category: initialData?.category && CATEGORIES.includes(initialData.category) ? initialData.category : DEFAULT_CATEGORY,
    tags: initialData?.tags || [],
    status: initialData?.status || 'draft',
    pinned: initialData?.pinned || false,
  }))
  const savedIdRef = useRef(initialData?.id || '')
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const localDraftTimerRef = useRef<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: { HTMLAttributes: { class: 'code-block' } },
        link: {
          openOnClick: false,
          enableClickSelection: true,
          autolink: true,
          linkOnPaste: true,
        },
      }),
      ImageExtension.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder: '开始写作…' }),
    ],
    content: initialData?.content || '',
    onCreate: ({ editor: currentEditor }) => {
      setContentLength(currentEditor.getText().trim().length)
    },
    onUpdate: ({ editor: currentEditor }) => {
      setContentLength(currentEditor.getText().trim().length)
      setHasUnsavedChanges(true)
      setSaveNotice('')
      setContentRevision((revision) => revision + 1)
    },
    editorProps: {
      attributes: {
        class: 'prose-blog min-h-[400px] outline-none px-0',
        'aria-label': '文章正文编辑器',
      },
      handleKeyDown(_view, event) {
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
          event.preventDefault()
          handleLinkToolbar()
          return true
        }
        return false
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

  function isGifFile(file: File) {
    return file.type === 'image/gif' || /\.gif$/i.test(file.name)
  }

  async function uploadContentImageDirect(file: File) {
    setContentImageUploading(true)
    try {
      const url = await uploadToCloudinaryDirect(file)
      editor?.chain().focus().setImage({ src: url, alt: file.name || '正文动图' }).run()
      setHasUnsavedChanges(true)
    } catch (err) {
      alert(`正文动图上传失败：${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setContentImageUploading(false)
    }
  }

  function beginContentImageCrop(file: File) {
    if (!file.type.startsWith('image/')) {
      alert('请选择图片文件')
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('图片不能超过 25MB，请压缩后再上传')
      return
    }
    if (isGifFile(file)) {
      void uploadContentImageDirect(file)
      return
    }
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

    // 视频与 GIF 直接上传，避免动图在 canvas 裁剪后丢失动画
    if (file.type.startsWith('video/') || isGifFile(file)) {
      // 视频体积提醒
      if (file.type.startsWith('video/') && file.size > 20 * 1024 * 1024) {
        if (!confirm(`这个视频文件 ${(file.size / 1024 / 1024).toFixed(1)}MB 比较大，会影响加载速度。建议先压到 5MB 以内。是否继续上传？`)) {
          return
        }
      }
      if (isGifFile(file) && file.size > MAX_IMAGE_BYTES) {
        alert('GIF 动图不能超过 25MB，请压缩后再上传')
        return
      }
      ;(async () => {
        setCoverUploading(true)
        try {
          const url = await uploadToCloudinaryDirect(file)
          setCoverImage(url)
          setHasUnsavedChanges(true)
        } catch (err) {
          alert(`封面上传失败：${err instanceof Error ? err.message : '未知错误'}`)
        } finally {
          setCoverUploading(false)
        }
      })()
      return
    }

    // 图片走裁剪流程
    if (file.size > MAX_IMAGE_BYTES) {
      alert('图片不能超过 25MB，请压缩后再上传')
      return
    }
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
      const outputType = croppedBlob.type || (pendingFile?.type === 'image/png' ? 'image/png' : 'image/webp')
      const extension = outputType === 'image/png' ? '.png' : outputType === 'image/jpeg' ? '.jpg' : '.webp'
      const file = new File(
        [croppedBlob],
        pendingFile?.name.replace(/\.[^.]+$/, extension) || (isContentImage ? `article-image${extension}` : `cover${extension}`),
        { type: outputType }
      )
      const url = await uploadToCloudinaryDirect(file)
      if (isContentImage) {
        editor?.chain().focus().setImage({ src: url, alt: pendingFile?.name || '正文图片' }).run()
      } else {
        setCoverImage(url)
      }
      setHasUnsavedChanges(true)
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

  function normalizeLink(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return ''
    if (trimmed.startsWith('/') || trimmed.startsWith('#') || /^(mailto:|tel:)/i.test(trimmed)) return trimmed
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    try {
      const url = new URL(candidate)
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
    } catch {
      return null
    }
  }

  function handleLinkToolbar() {
    if (!editor) return
    if (editor.state.selection.empty && !editor.isActive('link')) {
      alert('请先选中需要添加链接的文字')
      return
    }
    const currentHref = String(editor.getAttributes('link').href || '')
    const input = window.prompt('输入链接地址；留空可移除链接', currentHref)
    if (input === null) return
    const href = normalizeLink(input)
    if (href === null) {
      alert('链接格式无效，请使用 https://、站内路径、mailto: 或 tel:')
      return
    }
    if (!href) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    const isExternalWebLink = /^https?:\/\//i.test(href)
    editor.chain().focus().extendMarkRange('link').setLink({
      href,
      target: isExternalWebLink ? '_blank' : null,
      rel: isExternalWebLink ? 'noopener noreferrer' : null,
    }).run()
  }

  function editSelectedImageAlt() {
    if (!editor?.isActive('image')) return
    const currentAlt = String(editor.getAttributes('image').alt || '')
    const nextAlt = window.prompt('请输入图片说明，帮助读者和屏幕阅读器理解图片', currentAlt)
    if (nextAlt === null) return
    editor.chain().focus().updateAttributes('image', { alt: nextAlt.trim() || '正文图片' }).run()
  }

  const getPayload = useCallback((targetStatus?: 'draft' | 'published'): PostDraftPayload => {
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

  const getLocalDraftKey = useCallback(() => (
    `${LOCAL_DRAFT_PREFIX}:${savedIdRef.current || 'new'}`
  ), [])

  const queuePersist = useCallback((payload: ReturnType<typeof getPayload>) => {
    const task = saveQueueRef.current.then(async () => {
      const isNew = !savedIdRef.current
      const previousDraftKey = getLocalDraftKey()
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
      lastSavedSnapshot.current = JSON.stringify(payload)
      localStorage.removeItem(previousDraftKey)
      localStorage.removeItem(getLocalDraftKey())
      setHasUnsavedChanges(false)
      return data as Post
    })

    saveQueueRef.current = task.then(() => undefined, () => undefined)
    return task
  }, [getLocalDraftKey])

  useEffect(() => {
    if (!editor || recoveryChecked) return

    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = localStorage.getItem(getLocalDraftKey())
        if (stored) {
          const parsed: unknown = JSON.parse(stored)
          if (isLocalDraftRecord(parsed)) {
            const serverUpdatedAt = initialData?.updated_at ? Date.parse(initialData.updated_at) : 0
            const localUpdatedAt = Date.parse(parsed.savedAt)
            const differsFromServer = JSON.stringify(parsed.payload) !== lastSavedSnapshot.current
            if (differsFromServer && (!serverUpdatedAt || localUpdatedAt > serverUpdatedAt)) {
              setRecoveryDraft(parsed)
            } else {
              localStorage.removeItem(getLocalDraftKey())
            }
          } else {
            localStorage.removeItem(getLocalDraftKey())
          }
        }
      } catch {
        localStorage.removeItem(getLocalDraftKey())
      } finally {
        setRecoveryChecked(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [editor, getLocalDraftKey, initialData?.updated_at, recoveryChecked])

  useEffect(() => {
    if (!editor || !recoveryChecked || recoveryDraft) return
    if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current)

    const payload = getPayload()
    if (JSON.stringify(payload) === lastSavedSnapshot.current) {
      localStorage.removeItem(getLocalDraftKey())
      return
    }

    localDraftTimerRef.current = setTimeout(() => {
      try {
        const record: LocalDraftRecord = {
          savedAt: new Date().toISOString(),
          payload: getPayload(),
        }
        localStorage.setItem(getLocalDraftKey(), JSON.stringify(record))
      } catch {
        setAutoSaveMsg('本机草稿备份失败，请尽快手动保存')
      }
    }, 800)

    return () => {
      if (localDraftTimerRef.current) clearTimeout(localDraftTimerRef.current)
    }
  }, [contentRevision, editor, getLocalDraftKey, getPayload, recoveryChecked, recoveryDraft])

  useEffect(() => {
    if (!editor) return
    const dirty = JSON.stringify(getPayload()) !== lastSavedSnapshot.current
    setHasUnsavedChanges(dirty)
    if (dirty) setSaveNotice('')
  }, [editor, getPayload])

  function restoreLocalDraft() {
    if (!recoveryDraft || !editor) return
    const payload = recoveryDraft.payload
    setTitle(payload.title)
    setExcerpt(payload.excerpt)
    setCoverImage(payload.cover_image || '')
    setCategory(payload.category)
    setTags(payload.tags)
    setStatus(payload.status)
    setPinned(payload.pinned)
    editor.commands.setContent(payload.content)
    setRecoveryDraft(null)
    setHasUnsavedChanges(true)
    setSaveNotice('已恢复本机草稿，请保存后同步到云端')
  }

  function discardLocalDraft() {
    localStorage.removeItem(getLocalDraftKey())
    setRecoveryDraft(null)
  }

  const closePreview = useCallback(() => setPreviewOpen(false), [])

  async function save(targetStatus?: 'draft' | 'published') {
    if (!title.trim()) { alert('请输入文章标题'); return }
    if (coverUploading || contentImageUploading || cropSrc) {
      alert('图片仍在裁剪或上传，请完成后再保存')
      return
    }
    const payload = getPayload(targetStatus)
    if (targetStatus === 'published' && !hasMeaningfulPostContent(payload.content)) {
      alert('正文还是空的，请填写文字、图片或视频后再发布')
      return
    }
    if (
      targetStatus === 'published' &&
      hasInvestmentTemplatePlaceholders(payload.content)
    ) {
      alert('正文仍包含投资理财模板提示语，请填写完成后再发布')
      return
    }

    setSaving(true)
    setAutoSaveMsg('')
    try {
      const savedPost = await queuePersist(payload)
      if (targetStatus) {
        setStatus(targetStatus)
        if (targetStatus === 'published') {
          setLastPublishedSlug(savedPost.slug)
          setSaveNotice('发布成功，前台内容正在更新')
        } else {
          setLastPublishedSlug('')
          setSaveNotice('草稿已保存，可以继续编辑')
        }
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
      if (status !== 'draft' || !title.trim() || coverUploading || contentImageUploading || cropSrc) return
      const payload = getPayload()
      if (JSON.stringify(payload) === lastSavedSnapshot.current) return

      try {
        await queuePersist(payload)
        setAutoSaveMsg('已自动保存')
        setTimeout(() => setAutoSaveMsg(''), 2000)
      } catch {
        setAutoSaveMsg('网络保存失败，内容已保存在本机')
      }
    }, 30000)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [
    title,
    status,
    coverUploading,
    contentImageUploading,
    cropSrc,
    getPayload,
    queuePersist,
  ])

  useEffect(() => {
    function hasPendingWork() {
      const hasUnsavedChanges =
        !!editor &&
        JSON.stringify(getPayload()) !== lastSavedSnapshot.current
      return hasUnsavedChanges || coverUploading || contentImageUploading || !!cropSrc
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (hasPendingWork()) {
        event.preventDefault()
        event.returnValue = ''
      }
    }

    function handleLinkClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest('a')
      if (!anchor || !anchor.href || anchor.href === window.location.href) return
      if (hasPendingWork() && !window.confirm('当前文章还有未保存内容，确定要离开吗？')) {
        event.preventDefault()
        event.stopPropagation()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('click', handleLinkClick, true)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('click', handleLinkClick, true)
    }
  }, [editor, getPayload, coverUploading, contentImageUploading, cropSrc])

  return (
    <>
    {previewOpen && (
      <PostPreviewModal
        title={title}
        content={editor?.getHTML() || ''}
        excerpt={excerpt}
        coverImage={coverImage}
        category={category}
        onClose={closePreview}
      />
    )}
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onComplete={handleCropComplete}
        onCancel={handleCropCancel}
        aspectRatio={cropTarget === 'cover' ? 16 / 9 : 4 / 3}
        title={cropTarget === 'cover' ? '裁剪封面图' : '裁剪正文图片'}
        maxWidth={cropTarget === 'cover' ? 1600 : 1400}
        aspectOptions={cropTarget === 'content' ? CONTENT_ASPECT_OPTIONS : undefined}
        outputType={pendingFile?.type === 'image/png' ? 'image/png' : 'image/webp'}
      />
    )}
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-8rem)]">
      {/* Left: Editor */}
      <div className="flex-1 min-w-0 flex flex-col">
        {recoveryDraft && (
          <div className="mb-5 flex flex-col gap-3 rounded-[10px] border border-[#F4C98D] bg-[#FFF8EE] px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="status">
            <div>
              <p className="text-sm font-semibold text-[#7D4A1F]">发现一份尚未同步的本机草稿</p>
              <p className="mt-1 text-xs text-[#9A6A43]">
                保存于 {new Date(recoveryDraft.savedAt).toLocaleString('zh-CN')}，可能来自上次断网或意外关闭。
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button type="button" onClick={discardLocalDraft} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#8A6B52] hover:bg-white/70">
                忽略
              </button>
              <button type="button" onClick={restoreLocalDraft} className="rounded-lg bg-[#7D4A1F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#653B19]">
                恢复草稿
              </button>
            </div>
          </div>
        )}

        {/* Title */}
        <input
          name="post_title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="文章标题…"
          aria-label="文章标题"
          autoComplete="off"
          maxLength={160}
          className="w-full font-serif text-3xl font-bold text-[#1A1A1A] bg-transparent outline-none placeholder-[#C0C0BB] border-b border-[#E5E5E3] pb-3"
        />
        <p className="mb-5 mt-1 text-right text-[11px] tabular-nums text-[#9A9A96]">{title.length}/160</p>

        {/* Toolbar */}
        <div role="toolbar" aria-label="正文格式工具" className="sticky top-16 lg:top-4 z-20 flex flex-wrap gap-1 mb-4 p-2 bg-white border border-[#E5E5E3] rounded-[10px] shadow-sm">
          <ToolbarBtn
            onClick={() => editor?.chain().focus().undo().run()}
            title="撤销"
            shortcut="Control+Z Meta+Z"
            disabled={!editor?.can().chain().focus().undo().run()}
          >
            ↶
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().redo().run()}
            title="重做"
            shortcut="Control+Shift+Z Meta+Shift+Z"
            disabled={!editor?.can().chain().focus().redo().run()}
          >
            ↷
          </ToolbarBtn>
          <div aria-hidden="true" className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleBold().run()}
            active={editor?.isActive('bold')}
            title="加粗"
            shortcut="Control+B Meta+B"
          >
            <strong>B</strong>
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            active={editor?.isActive('italic')}
            title="斜体"
            shortcut="Control+I Meta+I"
          >
            <em>I</em>
          </ToolbarBtn>
          <div aria-hidden="true" className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn
            onClick={handleLinkToolbar}
            active={editor?.isActive('link')}
            title="添加或编辑链接"
            shortcut="Control+K Meta+K"
          >
            🔗
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().extendMarkRange('link').unsetLink().run()}
            title="移除链接"
            disabled={!editor?.isActive('link')}
          >
            断链
          </ToolbarBtn>
          <div aria-hidden="true" className="w-px bg-[#E5E5E3] mx-1" />
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
          <div aria-hidden="true" className="w-px bg-[#E5E5E3] mx-1" />
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
          <div aria-hidden="true" className="w-px bg-[#E5E5E3] mx-1" />
          <ToolbarBtn
            onClick={handleImageToolbar}
            title="裁剪并插入正文图片"
            disabled={contentImageUploading || !!cropSrc}
          >
            {contentImageUploading ? '上传中…' : '🖼️ 裁剪插图'}
          </ToolbarBtn>
          <ToolbarBtn
            onClick={editSelectedImageAlt}
            title="编辑所选图片说明"
            disabled={!editor?.isActive('image')}
          >
            图片说明
          </ToolbarBtn>
          <ToolbarBtn
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            title="分割线"
          >
            —
          </ToolbarBtn>
        </div>

        {/* Editor area */}
        <div className="flex-1 bg-white border border-[#E5E5E3] rounded-[10px] p-6 focus-within:ring-2 focus-within:ring-[#C09060]/30">
          <EditorContent editor={editor} />
        </div>

        {/* Bottom bar */}
        <div className="sticky bottom-0 z-20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 py-3 border-t border-[#E5E5E3] bg-[#FAFAF9]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs font-medium tabular-nums text-[#6A6A65]">
              正文 {contentLength} 字 · 约 {contentLength === 0 ? 0 : Math.max(1, Math.ceil(contentLength / 400))} 分钟阅读
            </span>
            {saving ? (
              <span role="status" className="text-xs font-semibold text-[#C09060]">正在保存…</span>
            ) : autoSaveMsg ? (
              <span role="status" className={`text-xs font-semibold ${autoSaveMsg.includes('失败') ? 'text-red-500' : 'text-green-500'}`}>
                {autoSaveMsg}
              </span>
            ) : saveNotice ? (
              <span role="status" className="text-xs font-semibold text-green-600">
                {saveNotice}
                {lastPublishedSlug && (
                  <a
                    href={`/posts/${lastPublishedSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 text-[#C09060] underline underline-offset-2"
                  >
                    查看前台
                  </a>
                )}
              </span>
            ) : hasUnsavedChanges ? (
              <span className="text-xs font-medium text-[#C09060]">有未保存更改，正在本机备份</span>
            ) : status === 'published' ? (
              <span className="text-xs font-medium text-[#9A9A96]">已发布文章需点击“更新发布”才会更新前台</span>
            ) : (
              <span className="text-xs font-medium text-[#9A9A96]">草稿每 30 秒自动保存</span>
            )}
          </div>
          <div className="grid w-full grid-cols-3 gap-2 self-end sm:flex sm:w-auto sm:gap-3 sm:self-auto">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={coverUploading || contentImageUploading || !!cropSrc}
              className="px-3 sm:px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold text-[#6A6A65] hover:border-[#C09060] hover:text-[#C09060] transition-colors disabled:opacity-50"
            >
              预览
            </button>
            <button
              type="button"
              onClick={() => save('draft')}
              disabled={saving || coverUploading || contentImageUploading || !!cropSrc}
              className="px-3 sm:px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold text-[#6A6A65] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-colors disabled:opacity-50"
            >
              {saving ? '保存中…' : status === 'published' ? '转为草稿' : '保存草稿'}
            </button>
            <button
              type="button"
              onClick={() => save('published')}
              disabled={saving || coverUploading || contentImageUploading || !!cropSrc}
              className="px-3 sm:px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
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
                  aria-label={`删除标签 ${tag}`}
                  className="text-[#9A9A96] hover:text-red-500 font-bold leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <input
            name="post_tags"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            placeholder="输入标签后按 Enter 添加…"
            aria-label="添加文章标签"
            autoComplete="off"
            maxLength={30}
            disabled={tags.length >= 10}
            className="w-full px-3 py-2 border border-[#E5E5E3] rounded-lg text-xs outline-none focus:border-[#1A1A1A] transition-colors disabled:bg-[#F5F5F3] disabled:text-[#9A9A96] disabled:cursor-not-allowed"
          />
          <p className="mt-1.5 text-right text-[10px] tabular-nums text-[#9A9A96]">{tags.length}/10 个标签</p>
        </div>

        {/* Cover image / video */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">封面（图片或动图）</p>
          {coverImage ? (
            <div className="relative">
              {/\.(mp4|webm|mov|m4v)(\?|$)/i.test(coverImage) || coverImage.includes('/video/upload/') ? (
                <MotionVideo
                  src={coverImage}
                  decorative
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={coverImage} alt="封面" width={640} height={256} className="w-full h-32 object-cover rounded-lg mb-2" />
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
                {coverUploading ? '上传中…' : '点击上传图片或动图'}
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
            name="post_excerpt"
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="不填则自动截取正文前 120 字…"
            aria-label="文章摘要"
            autoComplete="off"
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-[#E5E5E3] rounded-lg text-xs outline-none focus:border-[#1A1A1A] transition-colors resize-none"
          />
          <p className="mt-1.5 text-right text-[10px] tabular-nums text-[#9A9A96]">{excerpt.length}/500</p>
        </div>

        {/* Status */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-wider mb-3">发布状态</p>
          <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${
            status === 'published' ? 'bg-green-50 text-green-600' : 'bg-yellow-50 text-yellow-700'
          }`}>
            当前状态：{status === 'published' ? '已发布' : '草稿'}
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-[#9A9A96]">
            发布状态只会在点击“发布文章”“更新发布”或“转为草稿”后改变。
          </p>
        </div>

        {/* Pin to top */}
        <div className="bg-white border border-[#E5E5E3] rounded-[10px] p-4">
          <button
            type="button"
            onClick={() => setPinned(!pinned)}
            aria-pressed={pinned}
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
