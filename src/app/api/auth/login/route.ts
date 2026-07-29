import { NextRequest, NextResponse } from 'next/server'
import { signToken } from '@/lib/auth'

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000
const MAX_FAILED_ATTEMPTS = 5
const attempts = new Map<string, { count: number; resetAt: number }>()

// Constant-time string comparison to prevent timing attacks
function getClientKey(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
}

function isLockedOut(key: string): boolean {
  const record = attempts.get(key)
  if (!record) return false
  if (Date.now() > record.resetAt) {
    attempts.delete(key)
    return false
  }
  return record.count >= MAX_FAILED_ATTEMPTS
}

function recordFailure(key: string) {
  const now = Date.now()
  const record = attempts.get(key)
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return
  }
  record.count += 1
}

function clearFailures(key: string) {
  attempts.delete(key)
}

function hasUnsafeProductionConfig(adminPassword: string): boolean {
  return process.env.NODE_ENV === 'production' && (
    !process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD ||
    adminPassword === 'changeme123' ||
    !process.env.JWT_SECRET
  )
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison to avoid timing differences
    let diff = 0
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ (b.charCodeAt(i % b.length) || 0)
    void diff
    return false
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > 4096) {
      return NextResponse.json({ error: '请求内容过大' }, { status: 413 })
    }

    const body = await request.json()
    const { username, password } = body
    const inputUsername = typeof username === 'string' ? username : ''
    const inputPassword = typeof password === 'string' ? password : ''

    if (inputUsername.length > 100 || inputPassword.length > 256) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const clientKey = getClientKey(request)
    if (isLockedOut(clientKey)) {
      return NextResponse.json({ error: '尝试次数过多，请稍后再试' }, { status: 429 })
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin'
    const adminPassword = process.env.ADMIN_PASSWORD || 'changeme123'

    if (hasUnsafeProductionConfig(adminPassword)) {
      return NextResponse.json({ error: '后台登录配置不完整' }, { status: 500 })
    }

    if (!safeEqual(inputUsername, adminUsername) || !safeEqual(inputPassword, adminPassword)) {
      recordFailure(clientKey)
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    clearFailures(clientKey)
    const token = await signToken({ username: inputUsername, role: 'admin' })

    const response = NextResponse.json({ success: true })
    response.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    })
    return response
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: '请求格式错误' }, { status: 400 })
    }
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
