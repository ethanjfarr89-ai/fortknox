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

  // Scale the image so the crop region fills the container
  const scaleX = 100 / crop.width
  const scaleY = 100 / crop.height

  // Position the image so the crop region's top-left aligns with the container's top-left
  const left = -(crop.x / crop.width) * 100
  const top = -(crop.y / crop.height) * 100

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
