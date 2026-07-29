'use client'

import { useEffect, useState, useCallback } from 'react'

export function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')

  const close = useCallback(() => setSrc(null), [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.prose-blog')) {
        const img = target as HTMLImageElement
        setSrc(img.src)
        setAlt(img.alt || '')
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    if (src) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
      window.addEventListener('keydown', handleKey)
      return () => {
        document.body.style.overflow = previousOverflow
        window.removeEventListener('keydown', handleKey)
      }
    }
  }, [src, close])

  if (!src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
      className="lightbox-overlay"
      onClick={close}
    >
      <div className="lightbox-panel relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        {alt && (
          <p className="absolute left-1/2 top-full mt-3 -translate-x-1/2 max-w-[80vw] whitespace-nowrap overflow-hidden text-ellipsis text-sm text-white/75">
            {alt}
          </p>
        )}
        <button
          type="button"
          aria-label="关闭图片预览"
          onClick={close}
          autoFocus
          className="lightbox-close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
