'use client'

import { useState, useCallback } from 'react'
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
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImageBitmap(await fetch(imageSrc).then((r) => r.blob()))
  const canvas = document.createElement('canvas')
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(image, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, pixelCrop.width, pixelCrop.height)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92))
}

export function ImageCropModal({ imageSrc, onComplete, onCancel, aspectRatio = 16 / 9 }: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setProcessing(true)
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels)
      onComplete(blob)
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E5E3] flex items-center justify-between">
          <p className="font-semibold text-[#1A1A1A]">裁剪封面图</p>
          <button onClick={onCancel} className="text-[#9A9A96] hover:text-[#1A1A1A] text-xl leading-none">×</button>
        </div>

        {/* Crop area */}
        <div className="relative w-full" style={{ height: 320 }}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* Zoom slider */}
        <div className="px-5 py-3 border-t border-[#E5E5E3]">
          <div className="flex items-center gap-3">
            <span className="text-xs text-[#9A9A96] w-8">缩小</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#C09060]"
            />
            <span className="text-xs text-[#9A9A96] w-8">放大</span>
          </div>
        </div>

        <div className="px-5 py-4 flex gap-3 justify-end border-t border-[#E5E5E3]">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-[#E5E5E3] rounded-lg text-sm font-semibold text-[#6A6A65] hover:border-[#1A1A1A] transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="px-4 py-2 bg-[#1A1A1A] text-white rounded-lg text-sm font-semibold hover:bg-[#333] transition-colors disabled:opacity-50"
          >
            {processing ? '处理中...' : '确认裁剪'}
          </button>
        </div>
      </div>
    </div>
  )
}
