import type { CropArea } from '../types'

interface Props {
  src: string
  alt: string
  crop?: CropArea | null
  className?: string
}

export default function CroppedImage({ src, alt, crop, className = '' }: Props) {
  if (!crop || (crop.width === 100 && crop.height === 100 && crop.x === 0 && crop.y === 0)) {
    return <img src={src} alt={alt} className={className} />
  }

  // crop is percentage-based: {x, y, width, height} where values are 0-100
  // We render the image inside a clipping container
  const scale = 100 / crop.width
  const translateX = -crop.x * scale
  const translateY = -crop.y * scale

  return (
    <div className={`overflow-hidden ${className}`} style={{ position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: `${scale * 100}%`,
          height: `${scale * 100}%`,
          transform: `translate(${translateX}%, ${translateY}%)`,
          transformOrigin: 'top left',
          objectFit: 'cover',
        }}
      />
    </div>
  )
}
