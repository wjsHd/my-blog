'use client'

import { useEffect, useRef } from 'react'

interface MotionVideoProps {
  src: string
  className?: string
  label?: string
  decorative?: boolean
}

export function MotionVideo({ src, className, label, decorative = false }: MotionVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const video = videoRef.current

    const syncPlayback = () => {
      if (!video) return
      if (preference.matches) {
        video.pause()
      } else {
        void video.play().catch(() => undefined)
      }
    }

    syncPlayback()
    preference.addEventListener('change', syncPlayback)
    return () => preference.removeEventListener('change', syncPlayback)
  }, [src])

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      preload="metadata"
      className={className}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      tabIndex={decorative ? -1 : undefined}
    />
  )
}
