export function hasMeaningfulPostContent(html: string): boolean {
  if (!html) return false

  const hasMedia = /<(img|video)\b/i.test(html)
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()

  return hasMedia || text.length > 0
}
