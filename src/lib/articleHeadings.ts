export interface ArticleHeading {
  id: string
  text: string
  level: number
}

function plainText(html: string) {
  return html.replace(/<[^>]*>/g, '').trim()
}

function headingSlug(text: string, index: number) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fa5-]/g, '') || `section-${index + 1}`
}

function uniqueId(baseId: string, counts: Map<string, number>) {
  const count = counts.get(baseId) || 0
  counts.set(baseId, count + 1)
  return count === 0 ? baseId : `${baseId}-${count + 1}`
}

export function getArticleHeadings(html: string): ArticleHeading[] {
  const headings: ArticleHeading[] = []
  const counts = new Map<string, number>()
  const pattern = /<(h[23])([^>]*)>(.*?)<\/\1>/gi

  for (const match of html.matchAll(pattern)) {
    const text = plainText(match[3])
    if (!text) continue
    const existingId = match[2].match(/\bid=["']([^"']+)["']/i)?.[1]
    if (existingId) counts.set(existingId, (counts.get(existingId) || 0) + 1)
    const id = existingId || uniqueId(headingSlug(text, headings.length), counts)
    headings.push({ id, text, level: Number(match[1][1]) })
  }

  return headings
}

export function addArticleHeadingIds(html: string): string {
  const counts = new Map<string, number>()
  let index = 0

  return html.replace(/<(h[23])([^>]*)>(.*?)<\/\1>/gi, (match, tag, attrs, innerHtml) => {
    const text = plainText(innerHtml)
    const existingId = attrs.match(/\bid=["']([^"']+)["']/i)?.[1]
    if (existingId) {
      counts.set(existingId, (counts.get(existingId) || 0) + 1)
      index += 1
      return match
    }

    const id = uniqueId(headingSlug(text, index), counts)
    index += 1
    return `<${tag}${attrs} id="${id}">${innerHtml}</${tag}>`
  })
}

export function prepareArticleContent(html: string): string {
  return addArticleHeadingIds(html).replace(/<img\b([^>]*)>/gi, (match, attrs) => {
    const additions = [
      /\btabindex\s*=/i.test(attrs) ? '' : ' tabindex="0"',
      /\brole\s*=/i.test(attrs) ? '' : ' role="button"',
      /\baria-label\s*=/i.test(attrs) ? '' : ' aria-label="放大查看图片"',
    ].join('')
    return additions ? `<img${attrs}${additions}>` : match
  })
}
