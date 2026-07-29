import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'

const TOKEN_ISSUER = 'peter-blog'
const TOKEN_AUDIENCE = 'peter-blog-admin'

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production')
  }
  return new TextEncoder().encode(secret || 'fallback-secret-change-in-development')
}

export interface JWTPayload {
  username: string
  role: string
  iat?: number
  exp?: number
}

export async function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(TOKEN_ISSUER)
    .setAudience(TOKEN_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getJwtSecret())
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    })
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getAuthFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = request.cookies.get('admin_token')?.value
  if (!token) return null
  return verifyToken(token)
}

export async function isAdminRequest(request: NextRequest): Promise<boolean> {
  const payload = await getAuthFromRequest(request)
  return payload !== null && payload.role === 'admin'
}
