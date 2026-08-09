'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

export function ImageLightbox() {
  const [src, setSrc] = useState<string | null>(null)
  const [alt, setAlt] = useState('')
  const triggerRef = useRef<HTMLImageElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  const close = useCallback(() => {
    setSrc(null)
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const open = useCallback((img: HTMLImageElement) => {
    triggerRef.current = img
    setSrc(img.currentSrc || img.src)
    setAlt(img.alt || '')
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'IMG' && target.closest('.prose-blog')) {
        open(target as HTMLImageElement)
      }
    }
    function handleOpenKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (
        target.tagName === 'IMG' &&
        target.closest('.prose-blog') &&
        (e.key === 'Enter' || e.key === ' ')
      ) {
        e.preventDefault()
        open(target as HTMLImageElement)
      }
    }
    document.addEventListener('click', handleClick)
    document.addEventListener('keydown', handleOpenKey)
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleOpenKey)
    }
  }, [open])

  useEffect(() => {
    if (src) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') close()
        if (e.key === 'Tab') {
          e.preventDefault()
          closeButtonRef.current?.focus()
        }
      }
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
          ref={closeButtonRef}
          type="button"
          aria-label="关闭图片预览"
          onClick={close}
          className="lightbox-close"
        >
          ×
        </button>
      </div>
    </div>
  )
}
