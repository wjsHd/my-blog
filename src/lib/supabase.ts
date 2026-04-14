import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Force no-cache on all Supabase fetch calls to bypass Next.js fetch cache
const noStoreFetch = (url: RequestInfo | URL, options?: RequestInit) =>
  fetch(url, { ...options, cache: 'no-store' })

// Browser client - uses anon key (respects RLS policies)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: noStoreFetch },
})

// Server client - uses service role key (bypasses RLS for admin operations)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  global: { fetch: noStoreFetch },
})
