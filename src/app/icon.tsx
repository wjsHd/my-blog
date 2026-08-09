import { ImageResponse } from 'next/og'

export const size = {
  width: 64,
  height: 64,
}

export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 14,
          background: '#1A1A1A',
          color: '#D4AA80',
          fontFamily: 'Georgia, serif',
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        P
      </div>
    ),
    size
  )
}
