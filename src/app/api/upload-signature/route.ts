import { NextRequest, NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/auth'
import crypto from 'crypto'

export async function GET(request: NextRequest) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const timestamp = Math.round(Date.now() / 1000).toString()
  const folder = 'blog'
  const apiSecret = process.env.CLOUDINARY_API_SECRET!

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`
  const signature = crypto
    .createHash('sha1')
    .update(paramsToSign + apiSecret)
    .digest('hex')

  return NextResponse.json({
    signature,
    timestamp,
    folder,
    api_key: process.env.CLOUDINARY_API_KEY!,
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  })
}
