import { useCallback, useState } from 'react'
import Cropper from 'react-easy-crop'
import type { CropArea } from '../types'

interface Props {
  imageUrl: string
  initialCrop?: CropArea | null
  aspect?: number
  onSave: (crop: CropArea) => void
  onCancel: () => void
}

export default function ImageCropper({ imageUrl, initialCrop, aspect = 1, onSave, onCancel }: Props) {
  const [crop, setCrop] = useState({ x: initialCrop?.x ?? 0, y: initialCrop?.y ?? 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedArea, setCroppedArea] = useState<CropArea | null>(null)

  const onCropComplete = useCallback((_: unknown, croppedAreaPixels: CropArea) => {
    setCroppedArea(croppedAreaPixels)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col">
      <div className="flex-1 relative">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          cropShape="rect"
          showGrid={false}
          style={{
            containerStyle: { background: '#000' },
            cropAreaStyle: { border: '2px solid #c9a84e' },
          }}
        />
      </div>
      <div className="bg-neutral-900 border-t border-neutral-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs text-neutral-500">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-32 accent-gold-400"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-neutral-700 text-neutral-400 rounded-lg hover:bg-neutral-800 transition text-sm"
          >
            Cancel
          </button>
          <button
            onClick={() => croppedArea && onSave(croppedArea)}
            className="px-4 py-2 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            Save Crop
          </button>
        </div>
      </div>
    </div>
  )
}
