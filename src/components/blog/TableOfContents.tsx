'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { getArticleHeadings } from '@/lib/articleHeadings'

interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => getArticleHeadings(content), [content])
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (headings.length === 0) return

    observerRef.current?.disconnect()

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) {
          setActiveId(visible[0].target.id)
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    )

    headings.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    observerRef.current = observer
    return () => observer.disconnect()
  }, [headings])

  if (headings.length === 0) return null

  return (
    <nav aria-label="文章目录" className="bg-white border border-[#E5E5E3] rounded-[10px] p-5 sticky top-24">
      <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest mb-4">目录</p>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(h.id)
                const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
                window.history.replaceState(null, '', `#${h.id}`)
              }}
              aria-current={activeId === h.id ? 'location' : undefined}
              className={`block text-sm leading-relaxed py-1 transition-colors ${
                h.level === 3 ? 'pl-4' : ''
              } ${
                activeId === h.id
                  ? 'text-[#C09060] font-semibold'
                  : 'text-[#9A9A96] hover:text-[#1A1A1A]'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function MobileTableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => getArticleHeadings(content), [content])
  const detailsRef = useRef<HTMLDetailsElement>(null)

  if (headings.length === 0) return null

  return (
    <details ref={detailsRef} className="mobile-toc mb-8 rounded-[10px] border border-[#E5E5E3] bg-white lg:hidden">
      <summary className="pressable flex min-h-12 cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-[#1A1A1A]">
        <span>文章目录</span>
        <span className="mobile-toc-icon text-[#C09060]" aria-hidden="true">⌄</span>
      </summary>
      <nav aria-label="文章目录" className="border-t border-[#F0F0EE] px-4 py-3">
        <ol className="space-y-1">
          {headings.map((heading, index) => (
            <li key={heading.id}>
              <a
                href={`#${heading.id}`}
                className={`block rounded-md py-2 text-sm leading-relaxed text-[#6A6A65] hover:bg-[#F8F6F3] hover:text-[#C09060] ${
                  heading.level === 3 ? 'pl-6 pr-2' : 'px-2 font-medium'
                }`}
                onClick={(event) => {
                  event.preventDefault()
                  const element = document.getElementById(heading.id)
                  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  element?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
                  detailsRef.current?.removeAttribute('open')
                  window.history.replaceState(null, '', `#${heading.id}`)
                }}
              >
                <span className="mr-2 text-xs tabular-nums text-[#B3AAA1]">{String(index + 1).padStart(2, '0')}</span>
                {heading.text}
              </a>
            </li>
          ))}
        </ol>
      </nav>
    </details>
  )
}
