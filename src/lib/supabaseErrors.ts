import 'server-only'
import { NextResponse } from 'next/server'

export type SupabaseErrorLike = {
  code?: string
  message: string
}

export const CONTENT_SERVICE_UNAVAILABLE_MESSAGE = '内容服务暂时不可用，请稍后重试'

export function logSupabaseError(error: SupabaseErrorLike, operation: string): void {
  console.error(`[Supabase] ${operation} failed`, {
    code: error.code,
    message: error.message,
  })
}

/**
 * Public pages should fail regeneration when Supabase is unavailable.
 * Next.js can then keep serving the last successful ISR result instead of
 * replacing real content with a misleading empty state.
 */
export function assertSupabaseSuccess(error: SupabaseErrorLike | null, operation: string): void {
  if (!error) return

  logSupabaseError(error, operation)
  throw new Error(CONTENT_SERVICE_UNAVAILABLE_MESSAGE)
}

export function supabaseUnavailableResponse(error: SupabaseErrorLike, operation: string) {
  logSupabaseError(error, operation)
  return NextResponse.json(
    { error: CONTENT_SERVICE_UNAVAILABLE_MESSAGE },
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  )
}
