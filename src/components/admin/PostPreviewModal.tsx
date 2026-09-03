'use client'

import { useEffect, useMemo, useRef } from 'react'
import { MotionVideo } from '@/components/blog/MotionVideo'
import { sanitizeRichHtml } from '@/lib/sanitizeHtml'
import { calcReadingTime } from '@/lib/utils'

function isVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url) || url.includes('/video/upload/')
}

interface PostPreviewModalProps {
  title: string
  content: string
  excerpt: string
  coverImage: string
  category: string
  onClose: () => void
}

export function PostPreviewModal({
  title,
  content,
  excerpt,
  coverImage,
  category,
  onClose,
}: PostPreviewModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const safeContent = useMemo(() => sanitizeRichHtml(content), [content])
  const contentHasImage = /<img\b[^>]*\bsrc\s*=/i.test(safeContent)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'Tab') {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])') || []
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus()
    }
  }, [onClose])

  return (
    <div ref={dialogRef} className="fixed inset-0 z-[60] overflow-y-auto overscroll-contain bg-[#FAFAF9]" role="dialog" aria-modal="true" aria-label="文章发布预览">
      <div className="sticky top-0 z-10 border-b border-[#E5E5E3] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div>
            <p className="text-sm font-bold text-[#1A1A1A]">发布预览</p>
            <p className="text-xs text-[#9A9A96]">这是接近读者最终看到的文章效果</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#E5E5E3] px-4 py-2 text-sm font-semibold text-[#5A5A55] hover:border-[#1A1A1A] hover:text-[#1A1A1A]"
          >
            关闭预览
          </button>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 border-b border-[#E5E5E3] pb-8">
          <span className="inline-flex rounded-full bg-[#F5F5F3] px-2.5 py-1 text-xs font-semibold text-[#6A6A65]">
            {category}
          </span>
          <h1 className="mt-4 text-balance font-serif text-3xl font-bold leading-tight text-[#1A1A1A] sm:text-5xl">
            {title || '未命名文章'}
          </h1>
          <p className="mt-4 text-sm text-[#9A9A96]">约 {calcReadingTime(content)} 分钟阅读 · 预览内容尚未发布</p>
          {excerpt && <p className="mt-5 text-base leading-7 text-[#6A6A65]">{excerpt}</p>}
        </header>

        {coverImage && !contentHasImage && (
          <div className="mb-10 overflow-hidden rounded-[14px] bg-[#F5F5F3]">
            {isVideoUrl(coverImage) ? (
              <MotionVideo src={coverImage} className="aspect-video w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverImage} alt="文章封面预览" width={1600} height={900} className="aspect-video w-full object-cover" />
            )}
          </div>
        )}

        {safeContent ? (
          <div className="prose-blog" dangerouslySetInnerHTML={{ __html: safeContent }} />
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#D8D8D4] bg-white px-6 py-16 text-center text-sm text-[#9A9A96]">
            正文还是空的，填写内容后再发布。
          </div>
        )}
      </article>
    </div>
  )
}
