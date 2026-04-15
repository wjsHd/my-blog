'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'

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
      document.body.style.overflow = 'hidden'
      const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
      window.addEventListener('keydown', handleKey)
      return () => {
        document.body.style.overflow = ''
        window.removeEventListener('keydown', handleKey)
      }
    }
  }, [src, close])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 cursor-zoom-out"
      onClick={close}
    >
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />
        <button
          onClick={close}
          className="absolute -top-4 -right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#1A1A1A] shadow-lg hover:bg-[#F5F5F3] transition-colors text-lg font-bold"
        >
          ×
        </button>
      </div>
    </div>
  )
}
