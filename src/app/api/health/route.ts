import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { logSupabaseError } from '@/lib/supabaseErrors'

export const dynamic = 'force-dynamic'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

export async function GET() {
  const startedAt = Date.now()
  const [postsResult, settingsResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published'),
    supabase
      .from('site_settings')
      .select('id')
      .eq('id', 1)
      .maybeSingle(),
  ])

  const error = postsResult.error || settingsResult.error
  if (error) {
    logSupabaseError(error, 'health check')
    return NextResponse.json(
      {
        status: 'degraded',
        database: 'unavailable',
        checkedAt: new Date().toISOString(),
      },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }

  return NextResponse.json(
    {
      status: 'ok',
      database: 'reachable',
      publishedPosts: postsResult.count ?? 0,
      responseTimeMs: Date.now() - startedAt,
      checkedAt: new Date().toISOString(),
    },
    { headers: NO_STORE_HEADERS }
  )
}
