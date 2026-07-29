import { addArticleHeadingIds } from '@/lib/articleHeadings'

interface ArticleContentProps {
  content: string
}

export function ArticleContent({ content }: ArticleContentProps) {
  return (
    <div
      className="prose-blog"
      dangerouslySetInnerHTML={{ __html: addArticleHeadingIds(content) }}
    />
  )
}
