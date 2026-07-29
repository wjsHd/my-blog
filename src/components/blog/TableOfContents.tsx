'use client'

import { useEffect, useMemo, useState, useRef } from 'react'

interface Heading {
  id: string
  text: string
  level: number
}

function parseHeadings(html: string): Heading[] {
  const headings: Heading[] = []
  const pattern = /<(h[23])([^>]*)>(.*?)<\/\1>/gi
  for (const match of html.matchAll(pattern)) {
    const text = match[3].replace(/<[^>]*>/g, '').trim()
    const existingId = match[2].match(/\bid=["']([^"']+)["']/i)?.[1]
    const id = existingId || text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
    if (text) headings.push({ id, text, level: Number(match[1][1]) })
  }
  return headings
}

interface TableOfContentsProps {
  content: string
}

export function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => parseHeadings(content), [content])
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
    <nav className="bg-white border border-[#E5E5E3] rounded-[10px] p-5 sticky top-24">
      <p className="text-xs font-bold text-[#9A9A96] uppercase tracking-widest mb-4">目录</p>
      <ul className="space-y-1">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={(e) => {
                e.preventDefault()
                const el = document.getElementById(h.id)
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
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
