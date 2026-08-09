'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

interface ShareActionsProps {
  title: string
  url: string
}

export function ShareActions({ title, url }: ShareActionsProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const resetTimerRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
  }, [])

  function resetCopyStateLater() {
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => setCopyState('idle'), 2000)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
      resetCopyStateLater()
      return true
    } catch {
      setCopyState('error')
      resetCopyStateLater()
      return false
    }
  }

  async function sharePost() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copyLink()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={sharePost}
        className="pressable inline-flex h-10 items-center gap-2 rounded-md border border-[#E5E5E3] bg-white px-3 text-sm font-semibold text-[#5A5A55] hover:border-[#C09060] hover:text-[#C09060]"
      >
        <Share2 size={15} aria-hidden="true" />
        <span>分享</span>
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="pressable inline-flex h-10 items-center gap-2 rounded-md border border-[#E5E5E3] bg-white px-3 text-sm font-semibold text-[#5A5A55] hover:border-[#C09060] hover:text-[#C09060]"
      >
        {copyState === 'copied' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
        <span>{copyState === 'copied' ? '已复制' : copyState === 'error' ? '复制失败' : '复制链接'}</span>
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copyState === 'copied' ? '文章链接已复制到剪贴板' : copyState === 'error' ? '链接复制失败，请手动复制地址栏链接' : ''}
      </span>
    </div>
  )
}
