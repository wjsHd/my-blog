export interface Post {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  cover_image: string | null
  category: string
  tags: string[]
  status: 'draft' | 'published'
  reading_time: number
  views: number
  created_at: string
  updated_at: string
}

export interface SiteSettings {
  id: number
  blog_name: string
  author_name: string
  bio: string
  about_content: string
  avatar: string
  updated_at: string
}

export interface PaginatedPosts {
  posts: Post[]
  total: number
  page: number
  limit: number
  totalPages: number
}
