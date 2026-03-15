import { useEffect, useState } from 'react'
import type { CropArea } from '../types'

interface Props {
  src: string
  alt: string
  crop?: CropArea | null
  className?: string
}

export default function CroppedImage({ src, alt, crop, className = '' }: Props) {
  const [croppedSrc, setCroppedSrc] = useState(src)

  useEffect(() => {
    if (!crop || crop.width >= 99.9) {
      setCroppedSrc(src)
      return
    }

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) { setCroppedSrc(src); return }

      // crop values are percentages (0-100) of the original image
      const sx = (crop.x / 100) * img.naturalWidth
      const sy = (crop.y / 100) * img.naturalHeight
      const sw = (crop.width / 100) * img.naturalWidth
      const sh = (crop.height / 100) * img.naturalHeight

      canvas.width = sw
      canvas.height = sh
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)

      try {
        setCroppedSrc(canvas.toDataURL('image/jpeg', 0.9))
      } catch {
        // CORS blocked canvas - fall back to original
        setCroppedSrc(src)
      }
    }
    img.onerror = () => setCroppedSrc(src)
    img.src = src
  }, [src, crop])

  return <img src={croppedSrc} alt={alt} className={className} />
}
