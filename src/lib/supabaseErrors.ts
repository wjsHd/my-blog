import 'server-only'

type SupabaseErrorLike = {
  code?: string
  message: string
}

/**
 * Public pages should fail regeneration when Supabase is unavailable.
 * Next.js can then keep serving the last successful ISR result instead of
 * replacing real content with a misleading empty state.
 */
export function assertSupabaseSuccess(error: SupabaseErrorLike | null, operation: string): void {
  if (!error) return

  console.error(`[Supabase] ${operation} failed`, {
    code: error.code,
    message: error.message,
  })
  throw new Error('内容服务暂时不可用，请稍后重试')
}
