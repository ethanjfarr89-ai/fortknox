import type { CropArea } from '../types'

interface Props {
  src: string
  alt: string
  crop?: CropArea | null
  className?: string
}

/**
 * Displays a cropped image using pure CSS (no canvas, no CORS issues).
 * crop values are percentages (0–100) of the original image.
 */
export default function CroppedImage({ src, alt, crop, className = '' }: Props) {
  if (!crop || (crop.width >= 99.9 && crop.height >= 99.9)) {
    return <img src={src} alt={alt} className={className} />
  }

  // Use uniform scale to avoid stretching — pick the larger scale so the
  // crop region fully covers the container, then let overflow: hidden clip.
  const scaleX = 100 / crop.width
  const scaleY = 100 / crop.height
  const scale = Math.max(scaleX, scaleY)

  // Position the image so the crop region is centered in the container
  const left = -(crop.x * scale)
  const top = -(crop.y * scale)

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          width: `${scale * 100}%`,
          height: 'auto',
          left: `${left}%`,
          top: `${top}%`,
          maxWidth: 'none',
        }}
      />
    </div>
  )
}
