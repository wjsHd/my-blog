import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Public client - uses anon key, allows Next.js ISR cache for performance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client - uses service role key, always bypass cache for fresh data
const noStoreFetch = (url: RequestInfo | URL, options?: RequestInit) =>
  fetch(url, { ...options, cache: 'no-store' })

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: { fetch: noStoreFetch },
})

// 最多允许 3 个置顶，超出时挤掉最老的（LRU）
export const MAX_PINNED = 3

/**
 * 在保存某篇文章后，确保置顶数量不超过 MAX_PINNED。
 * 如果当前 ID 是置顶的，且总置顶数 > MAX_PINNED，
 * 把除当前 ID 外置顶时间最早的那篇自动取消置顶。
 */
export async function enforcePinLimit(currentId: string) {
  const { data: pinned } = await supabaseAdmin
    .from('posts')
    .select('id, pinned_at')
    .eq('pinned', true)
    .order('pinned_at', { ascending: true, nullsFirst: true })

  if (!pinned || pinned.length <= MAX_PINNED) return

  // 排除当前 ID 后，最老的若干篇取消置顶
  const others = pinned.filter((p) => p.id !== currentId)
  const overflow = pinned.length - MAX_PINNED
  const toUnpin = others.slice(0, overflow).map((p) => p.id)

  if (toUnpin.length > 0) {
    await supabaseAdmin
      .from('posts')
      .update({ pinned: false, pinned_at: null })
      .in('id', toUnpin)
  }
}
