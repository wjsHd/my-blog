'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Cropper from 'react-easy-crop'

interface Area {
  x: number
  y: number
  width: number
  height: number
}

interface ImageCropModalProps {
  imageSrc: string
  onComplete: (croppedBlob: Blob) => void
  onCancel: () => void
  aspectRatio?: number
  title?: string
  maxWidth?: number
  aspectOptions?: Array<{ label: string; value: number | 'original' }>
  outputType?: 'image/jpeg' | 'image/png' | 'image/webp'
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxWidth: number,
  outputType: 'image/jpeg' | 'image/png' | 'image/webp'
): Promise<Blob> {
  const image = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()))
  try {
    const scale = Math.min(1, maxWidth / pixelCrop.width)
    const outputWidth = Math.max(1, Math.round(pixelCrop.width * scale))
    const outputHeight = Math.max(1, Math.round(pixelCrop.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = outputWidth
    canvas.height = outputHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('浏览器无法处理这张图片')
    ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputWidth, outputHeight)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('图片压缩失败')),
        outputType,
        outputType === 'image/png' ? undefined : 0.88
      )
    })
  } finally {
    image.close()
  }
}

export function ImageCropModal({
  imageSrc,
  onComplete,
  onCancel,
  aspectRatio = 16 / 9,
  title = '裁剪图片',
  maxWidth = 1600,
  aspectOptions,
  outputType = 'image/webp',
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [aspectChoice, setAspectChoice] = useState<number | 'original'>(aspectOptions?.[0]?.value ?? aspectRatio)
  const [originalAspect, setOriginalAspect] = useState(aspectRatio)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processing) onCancel()
      if (event.key === 'Tab') {
        const focusable = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)') || []
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onCancel, processing])

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    setError('')
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, maxWidth, outputType)
      onComplete(blob)
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : '图片处理失败，请重新选择')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/70" role="dialog" aria-modal="true" aria-label={title}>
      <div ref={panelRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
          <div>
            <p className="font-semibold text-[#1A1A1A]">{title}</p>
            <p className="text-xs text-[#9A9A96] mt-0.5">拖动图片调整位置，使用滑杆缩放</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onCancel}
            disabled={processing}
            aria-label="关闭裁剪窗口"
            className="text-[#9A9A96] hover:text-[#1A1A1A] text-xl leading-none disabled:opacity-40"
          >×</button>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectChoice === 'original' ? originalAspect : aspectChoice}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            onMediaLoaded={(mediaSize) => {
              if (mediaSize.naturalWidth > 0 && mediaSize.naturalHeight > 0) {
                setOriginalAspect(mediaSize.naturalWidth / mediaSize.naturalHeight)
              }
            }}
          />
        </div>

        {/* Ratio and zoom controls */}
        <div className="space-y-3 border-t border-[#E5E5E3] px-5 py-3">
          {aspectOptions && aspectOptions.length > 1 && (
            <div className="flex flex-wrap items-center gap-2" aria-label="裁剪比例">
              <span className="mr-1 text-xs text-[#9A9A96]">比例</span>
              {aspectOptions.map((option) => (
                <button
                  key={`${option.label}-${option.value}`}
                  type="button"
                  onClick={() => setAspectChoice(option.value)}
                  aria-pressed={aspectChoice === option.value}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                    aspectChoice === option.value
                      ? 'bg-[#1A1A1A] text-white'
                      : 'bg-[#F5F5F3] text-[#6A6A65] hover:bg-[#E8E8E5]'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9A9A96] w-8">缩小</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              aria-label="图片缩放"
              aria-valuetext={`${Math.round(zoom * 100)}%`}
              className="flex-1 accent-[#C09060]"
            />
            <span className="text-xs text-[#9A9A96] w-8">放大</span>
          </div>
        </div>

        {error && (
          <p role="alert" className="mx-5 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
            {error}
          </p>
        )}

        <div className="px-5 py-4 flex gap-3 justify-end border-t border-[#E5E5E3]">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold text-[#6A6A65] hover:border-[#1A1A1A] transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={processing || !croppedAreaPixels}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {processing ? '处理中…' : '确认裁剪'}
          </button>
        </div>
      </div>
    </div>
  )
}
