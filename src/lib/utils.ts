import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs)
}

export function generateSlug(title: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
  return `${sanitized}-${Date.now().toString(36)}`
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim()
}

export function getExcerpt(content: string, length = 120): string {
  const text = stripHtml(content)
  if (text.length <= length) return text
  return text.slice(0, length) + '...'
}

export function calcReadingTime(content: string): number {
  const text = stripHtml(content)
  // Chinese reading speed ~300 chars/min
  const charCount = text.length
  const minutes = Math.ceil(charCount / 300)
  return Math.max(1, minutes)
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

export function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  const month = date.toLocaleString('en-US', { month: 'short' })
  const day = date.getDate()
  return `${month} ${day}`
}

export function formatDateISO(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toISOString().split('T')[0]
}

export function groupPostsByMonth(posts: Array<{ created_at: string; title: string; slug: string }>): Record<string, typeof posts> {
  const groups: Record<string, typeof posts> = {}
  posts.forEach((post) => {
    const date = new Date(post.created_at)
    const key = `${date.getFullYear()}年${date.getMonth() + 1}月`
    if (!groups[key]) groups[key] = []
    groups[key].push(post)
  })
  return groups
}
