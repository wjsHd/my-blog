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
  return (
    <div
      className="prose-blog"
      dangerouslySetInnerHTML={{ __html: processContent(content) }}
    />
  )
}
