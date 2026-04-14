import crypto from 'crypto'

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME!
const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY!
const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET!

function generateSignature(params: Record<string, string>, apiSecret: string): string {
  const sortedKeys = Object.keys(params).sort()
  const signatureString = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return crypto
    .createHash('sha1')
    .update(signatureString + apiSecret)
    .digest('hex')
}

export async function uploadToCloudinary(file: Buffer, filename: string): Promise<string> {
  const timestamp = Math.round(Date.now() / 1000).toString()
  const folder = 'blog'

  const params: Record<string, string> = {
    folder,
    timestamp,
  }

  const signature = generateSignature(params, CLOUDINARY_API_SECRET)

  const formData = new FormData()
  const blob = new Blob([file], { type: 'image/jpeg' })
  formData.append('file', blob, filename)
  formData.append('api_key', CLOUDINARY_API_KEY)
  formData.append('timestamp', timestamp)
  formData.append('folder', folder)
  formData.append('signature', signature)

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cloudinary upload failed: ${error}`)
  }

  const data = await response.json()
  return data.secure_url as string
}
