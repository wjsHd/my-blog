import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminMutation } from '@/lib/auth'
import crypto from 'crypto'

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' }

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeAdminMutation(request)
  if (authorizationError) return authorizationError

  const timestamp = Math.round(Date.now() / 1000).toString()
  const folder = 'blog'
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  const apiKey = process.env.CLOUDINARY_API_KEY
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME

  if (!apiSecret || !apiKey || !cloudName) {
    return NextResponse.json(
      { error: '图片服务配置不完整' },
      { status: 503, headers: NO_STORE_HEADERS }
    )
  }

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  return NextResponse.json(
    {
      signature,
      timestamp,
      folder,
      api_key: apiKey,
      cloud_name: cloudName,
    },
    { headers: NO_STORE_HEADERS }
  )
}
