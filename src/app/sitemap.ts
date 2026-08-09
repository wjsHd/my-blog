import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://my-blog-wheat.vercel.app'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data: posts } = await supabase
    .from('posts')
    .select('slug, updated_at, created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  const latestContentUpdate = (posts || []).reduce<Date | undefined>((latest, post) => {
    const updatedAt = new Date(post.updated_at || post.created_at)
    return !latest || updatedAt > latest ? updatedAt : latest
  }, undefined)

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      ...(latestContentUpdate ? { lastModified: latestContentUpdate } : {}),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/about`,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/archive`,
      ...(latestContentUpdate ? { lastModified: latestContentUpdate } : {}),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ]

  const postRoutes: MetadataRoute.Sitemap = (posts || []).map((post) => ({
    url: `${siteUrl}/posts/${post.slug}`,
    lastModified: new Date(post.updated_at || post.created_at),
    changeFrequency: 'weekly',
    priority: 0.8,
  }))

  return [...staticRoutes, ...postRoutes]
}
