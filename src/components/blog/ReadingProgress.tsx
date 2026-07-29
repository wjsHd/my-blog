'use client'

import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function ReadingProgress() {
  const [progress, setProgress] = useState(0)
  const [showBackToTop, setShowBackToTop] = useState(false)

  useEffect(() => {
    let frame = 0

    function updateProgress() {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        const scrollTop = window.scrollY
        const docHeight = document.documentElement.scrollHeight - window.innerHeight
        setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0)
        setShowBackToTop(scrollTop > 640)
        frame = 0
      })
    }

    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[60] h-[2px] bg-transparent" aria-hidden="true">
        <div
          className="h-full bg-[#C09060] transition-all duration-100 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <button
        type="button"
        aria-label="返回顶部"
        onClick={() => {
          const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
          window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
        }}
        className={`pressable fixed bottom-5 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-[#E5E5E3] bg-white/95 text-[#6A6A65] shadow-lg backdrop-blur transition-all duration-300 hover:border-[#C09060] hover:text-[#C09060] sm:bottom-7 sm:right-7 ${
          showBackToTop ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        <ArrowUp size={18} />
      </button>
    </>
  )
}
