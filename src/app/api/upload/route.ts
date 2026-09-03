import { NextRequest, NextResponse } from 'next/server'
import { authorizeAdminMutation } from '@/lib/auth'
import { uploadToCloudinary } from '@/lib/cloudinary'

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
])

function hasExpectedImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
  if (mimeType === 'image/png') return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))
  if (mimeType === 'image/webp') {
    return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  }
  if (mimeType === 'image/avif') {
    return buffer.subarray(4, 8).toString('ascii') === 'ftyp' && buffer.subarray(8, 32).includes(Buffer.from('avif'))
  }
  return false
}

export async function POST(request: NextRequest) {
  const authorizationError = await authorizeAdminMutation(request)
  if (authorizationError) return authorizationError

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '未找到文件' }, { status: 400 })
    }

    // SVG and arbitrary image/* payloads can contain active content. The editor only
    // accepts raster formats and verifies their magic bytes before forwarding them.
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json({ error: '只支持 JPG、PNG、WebP、GIF 或 AVIF 图片' }, { status: 400 })
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: '文件大小不能超过10MB' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    if (!hasExpectedImageSignature(buffer, file.type)) {
      return NextResponse.json({ error: '图片内容与文件格式不一致' }, { status: 400 })
    }

    const url = await uploadToCloudinary(buffer, file.name, file.type)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: '上传失败，请检查 Cloudinary 配置' }, { status: 500 })
  }
}
