const ALLOWED_CATEGORIES = new Set(['文章', '工作', '思考', '生活', '投资理财'])
const ALLOWED_STATUSES = new Set(['draft', 'published'])

export interface NormalizedPostInput {
  title: string
  content: string
  excerpt: string
  cover_image: string | null
  category: string
  tags: string[]
  status: 'draft' | 'published'
  pinned: boolean
}

type NormalizationResult =
  | { data: NormalizedPostInput; error?: never }
  | { data?: never; error: string }

function normalizeOptionalUrl(value: unknown): string | null | undefined {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 2048) return undefined

  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

export function normalizePostInput(input: unknown): NormalizationResult {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: '请求格式错误' }
  }

  const body = input as Record<string, unknown>
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const content = typeof body.content === 'string' ? body.content : ''
  const excerpt = typeof body.excerpt === 'string' ? body.excerpt.trim() : ''
  const category = typeof body.category === 'string' ? body.category : '文章'
  const status = typeof body.status === 'string' ? body.status : 'draft'
  const coverImage = normalizeOptionalUrl(body.cover_image)

  if (!title) return { error: '标题不能为空' }
  if (title.length > 160) return { error: '标题不能超过160个字符' }
  if (content.length > 2_000_000) return { error: '正文内容过长' }
  if (excerpt.length > 500) return { error: '摘要不能超过500个字符' }
  if (!ALLOWED_CATEGORIES.has(category)) return { error: '无效分类' }
  if (!ALLOWED_STATUSES.has(status)) return { error: '无效发布状态' }
  if (coverImage === undefined) return { error: '封面地址无效' }

  const tags = Array.isArray(body.tags)
    ? body.tags
        .filter((tag): tag is string => typeof tag === 'string')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : []

  if (tags.length > 10 || tags.some((tag) => tag.length > 30)) {
    return { error: '标签最多10个，每个不超过30个字符' }
  }

  return {
    data: {
      title,
      content,
      excerpt,
      cover_image: coverImage,
      category,
      tags: [...new Set(tags)],
      status: status as 'draft' | 'published',
      pinned: body.pinned === true,
    },
  }
}
