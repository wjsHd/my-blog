import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

// Protected admin routes (excludes /admin/login)
const ADMIN_PATHS = ['/admin', '/admin/posts', '/admin/settings']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip login page
  if (pathname === '/admin/login') return NextResponse.next()

  // Protect all /admin/* paths
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('admin_token')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
