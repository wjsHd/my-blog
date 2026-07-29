import { supabase } from '@/lib/supabase'

export const revalidate = 3600

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://my-blog-wheat.vercel.app'

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const [{ data: settings }, { data: posts, error }] = await Promise.all([
    supabase
      .from('site_settings')
      .select('blog_name, bio')
      .eq('id', 1)
      .single(),
    supabase
      .from('posts')
      .select('title, slug, excerpt, category, created_at, updated_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (error) {
    return new Response('RSS feed is temporarily unavailable', { status: 503 })
  }

  const blogName = settings?.blog_name || 'Peter · 随笔'
  const description = settings?.bio || '记录工作、思考、生活与投资理财实践'
  const items = (posts || []).map((post) => {
    const url = `${siteUrl}/posts/${post.slug}`
    return `
      <item>
        <title>${escapeXml(post.title)}</title>
        <link>${escapeXml(url)}</link>
        <guid isPermaLink="true">${escapeXml(url)}</guid>
        <description>${escapeXml(post.excerpt || '')}</description>
        <category>${escapeXml(post.category || '文章')}</category>
        <pubDate>${new Date(post.created_at).toUTCString()}</pubDate>
      </item>`
  }).join('')

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(blogName)}</title>
    <link>${escapeXml(siteUrl)}</link>
    <description>${escapeXml(description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  return new Response(feed, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
