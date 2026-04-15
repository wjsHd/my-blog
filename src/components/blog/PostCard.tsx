import Link from 'next/link'
import Image from 'next/image'
import { Post } from '@/types'
import { formatDate, getExcerpt } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  '文章': 'bg-blue-50 text-blue-600',
  '思考': 'bg-purple-50 text-purple-600',
  '生活': 'bg-green-50 text-green-600',
}

function getCategoryColor(category: string) {
  return CATEGORY_COLORS[category] || 'bg-amber-50 text-amber-600'
}

interface PostCardProps {
  post: Post
  featured?: boolean
}

export function PostCard({ post, featured = false }: PostCardProps) {
  const excerpt = post.excerpt || getExcerpt(post.content, 100)

  if (featured) {
    return (
      <Link href={`/posts/${post.slug}`} className="group block">
        <article className="bg-white border border-[#E5E5E3] rounded-[10px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
          {post.cover_image && (
            <div className="relative w-full h-64 sm:h-80 overflow-hidden">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 768px) 100vw, 700px"
              />
            </div>
          )}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-4">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getCategoryColor(post.category)}`}>
                {post.category}
              </span>
              <span className="text-sm text-[#9A9A96]">{formatDate(post.created_at)}</span>
              <span className="text-sm text-[#9A9A96]">· {post.reading_time} 分钟阅读</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#1A1A1A] mb-3 leading-snug group-hover:text-[#C09060] transition-colors">
              {post.title}
            </h2>
            <p className="text-[#5A5A55] leading-relaxed line-clamp-3">{excerpt}</p>
          </div>
        </article>
      </Link>
    )
  }

  return (
    <Link href={`/posts/${post.slug}`} className="group block">
      <article className="bg-white border border-[#E5E5E3] rounded-[10px] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full flex flex-col">
        {post.cover_image && (
          <div className="relative w-full h-44 overflow-hidden flex-shrink-0">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 350px"
            />
          </div>
        )}
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getCategoryColor(post.category)}`}>
              {post.category}
            </span>
          </div>
          <h2 className="font-serif text-lg font-bold text-[#1A1A1A] mb-2 leading-snug group-hover:text-[#C09060] transition-colors line-clamp-2">
            {post.title}
          </h2>
          <p className="text-sm text-[#6A6A65] leading-relaxed line-clamp-2 flex-1">{excerpt}</p>
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F0F0EE]">
            <span className="text-xs text-[#9A9A96]">{formatDate(post.created_at)}</span>
            <span className="text-xs text-[#9A9A96]">· {post.reading_time} 分钟</span>
          </div>
        </div>
      </article>
    </Link>
  )
}

// Minimal list-style card for sidebar / recent posts
export function PostListItem({ post }: { post: Post }) {
  return (
    <Link href={`/posts/${post.slug}`} className="group flex gap-3 py-3 border-b border-[#F0F0EE] last:border-0">
      {post.cover_image && (
        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
          <Image src={post.cover_image} alt={post.title} fill className="object-cover" sizes="64px" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1A1A] group-hover:text-[#C09060] transition-colors line-clamp-2 leading-snug">
          {post.title}
        </p>
        <p className="text-xs text-[#9A9A96] mt-1">{formatDate(post.created_at)}</p>
      </div>
    </Link>
  )
}
