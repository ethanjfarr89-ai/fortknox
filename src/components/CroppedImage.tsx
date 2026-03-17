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
 *
 * The crop region is mapped 1:1 onto the container. Since the user sets
 * the crop interactively with the container visible, the crop aspect ratio
 * should closely match the container's — any slight mismatch is imperceptible.
 */
export default function CroppedImage({ src, alt, crop, className = '' }: Props) {
  if (!crop || (crop.width >= 99.9 && crop.height >= 99.9)) {
    return <img src={src} alt={alt} className={className} />
  }

  // Scale so the crop region fills the container exactly
  const scaleX = 100 / crop.width
  const scaleY = 100 / crop.height

  // Offset so the crop region's top-left aligns with the container's top-left
  const left = -(crop.x * scaleX)
  const top = -(crop.y * scaleY)

  return (
    <div className={className} style={{ position: 'relative', overflow: 'hidden' }}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          width: `${scaleX * 100}%`,
          height: `${scaleY * 100}%`,
          left: `${left}%`,
          top: `${top}%`,
          maxWidth: 'none',
        }}
      />
    </div>
  )
}
