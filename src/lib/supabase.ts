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
