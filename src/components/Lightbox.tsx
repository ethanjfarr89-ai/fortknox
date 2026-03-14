import { useEffect, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  photos: string[]
  initialIndex: number
  onClose: () => void
}

export default function Lightbox({ photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIndex(i => (i > 0 ? i - 1 : photos.length - 1))
      if (e.key === 'ArrowRight') setIndex(i => (i < photos.length - 1 ? i + 1 : 0))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [photos.length, onClose])

  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition z-10">
        <X className="w-6 h-6" />
      </button>

      {photos.length > 1 && (
        <>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i > 0 ? i - 1 : photos.length - 1)) }}
            className="absolute left-4 p-2 text-white/70 hover:text-white transition z-10"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={e => { e.stopPropagation(); setIndex(i => (i < photos.length - 1 ? i + 1 : 0)) }}
            className="absolute right-4 p-2 text-white/70 hover:text-white transition z-10"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <img
        src={photos[index]}
        alt=""
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
        onClick={e => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <div className="absolute bottom-6 flex gap-2">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIndex(i) }}
              className={`w-2 h-2 rounded-full transition ${i === index ? 'bg-gold-400' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
