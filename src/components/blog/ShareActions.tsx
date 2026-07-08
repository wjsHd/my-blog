'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'

interface ShareActionsProps {
  title: string
  url: string
}

export function ShareActions({ title, url }: ShareActionsProps) {
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  async function sharePost() {
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
        return
      } catch {
        return
      }
    }
    await copyLink()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={sharePost}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E5E3] bg-white px-3 text-sm font-semibold text-[#5A5A55] transition-colors hover:border-[#C09060] hover:text-[#C09060]"
      >
        <Share2 size={15} />
        <span>分享</span>
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-[#E5E5E3] bg-white px-3 text-sm font-semibold text-[#5A5A55] transition-colors hover:border-[#C09060] hover:text-[#C09060]"
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}
        <span>{copied ? '已复制' : '复制链接'}</span>
      </button>
    </div>
  )
}
