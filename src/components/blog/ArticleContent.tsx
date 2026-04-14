'use client'

import { useEffect, useRef } from 'react'

interface ArticleContentProps {
  content: string
}

// Add IDs to headings for TOC scrolling
function processContent(html: string): string {
  return html.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, text) => {
    const plainText = text.replace(/<[^>]*>/g, '')
    const id = plainText.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fa5-]/g, '')
    if (attrs.includes('id=')) return match
    return `<${tag}${attrs} id="${id}">${text}</${tag}>`
  })
}

export function ArticleContent({ content }: ArticleContentProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Image lightbox
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const images = container.querySelectorAll('img')

    function openLightbox(src: string, alt: string) {
      const overlay = document.createElement('div')
      overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;
        display:flex;align-items:center;justify-content:center;cursor:zoom-out;
        animation:fadeIn 0.2s ease;
      `
      const img = document.createElement('img')
      img.src = src
      img.alt = alt
      img.style.cssText = `
        max-width:90vw;max-height:90vh;object-fit:contain;
        border-radius:8px;box-shadow:0 20px 60px rgba(0,0,0,0.5);
      `
      overlay.appendChild(img)
      overlay.addEventListener('click', () => overlay.remove())
      document.body.appendChild(overlay)
    }

    const handlers: Array<() => void> = []
    images.forEach((img) => {
      img.style.cursor = 'zoom-in'
      const handler = () => openLightbox(img.src, img.alt)
      img.addEventListener('click', handler)
      handlers.push(() => img.removeEventListener('click', handler))
    })

    return () => handlers.forEach((h) => h())
  }, [content])

  return (
    <div
      ref={containerRef}
      className="prose-blog"
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  )
}
