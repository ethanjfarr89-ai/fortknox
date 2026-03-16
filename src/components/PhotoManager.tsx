import { useState } from 'react'
import { X, Upload, Star, Crop, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CropArea } from '../types'
import ImageCropper from './ImageCropper'

interface Props {
  label: string
  urls: string[]
  onChange: (urls: string[]) => void
  profileIndex?: number
  onSetProfile?: (index: number) => void
  onCropPhoto?: (index: number, crop: CropArea) => void
  photoCrops?: Record<string, CropArea> | null
  showProfileSelect?: boolean
  existingPhotos?: string[]
}

export default function PhotoManager({ label, urls, onChange, profileIndex, onSetProfile, onCropPhoto, photoCrops, showProfileSelect, existingPhotos }: Props) {
  const [uploading, setUploading] = useState(false)
  const [cropIndex, setCropIndex] = useState<number | null>(null)
  const [showExisting, setShowExisting] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${ext}`

      const { error } = await supabase.storage.from('photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })

      if (error) {
        console.error('Upload error:', error)
        continue
      }

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
      newUrls.push(urlData.publicUrl)
    }

    onChange([...urls, ...newUrls])
    setUploading(false)
    e.target.value = ''
  }

  const remove = (index: number) => {
    const updated = urls.filter((_, i) => i !== index)
    onChange(updated)
    setActiveIndex(null)
    if (showProfileSelect && onSetProfile && profileIndex !== undefined) {
      if (index === profileIndex) {
        onSetProfile(0)
      } else if (index < profileIndex) {
        onSetProfile(profileIndex - 1)
      }
    }
  }

  const addExisting = (url: string) => {
    if (!urls.includes(url)) {
      onChange([...urls, url])
    }
  }

  const toggleActive = (i: number) => {
    setActiveIndex(prev => prev === i ? null : i)
  }

  const availableExisting = existingPhotos?.filter(url => !urls.includes(url)) ?? []

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-400 mb-1">{label}</label>
      {urls.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {urls.map((url, i) => {
            const isActive = activeIndex === i
            const isProfile = showProfileSelect && i === profileIndex
            const hasCrop = photoCrops && photoCrops[String(i)]

            return (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                  onClick={() => toggleActive(i)}
                />
                {/* Action buttons — visible on hover (desktop) or tap (mobile) */}
                <div
                  className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-2 transition ${
                    isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                  }`}
                  onClick={() => toggleActive(i)}
                >
                  {showProfileSelect && onSetProfile && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onSetProfile(i); setActiveIndex(null) }}
                      className={`p-1.5 rounded-full ${isProfile ? 'text-gold-400 bg-black/40' : 'text-white hover:text-gold-400'}`}
                      title="Set as main photo"
                    >
                      <Star className={`w-4 h-4 ${isProfile ? 'fill-gold-400' : ''}`} />
                    </button>
                  )}
                  {onCropPhoto && (
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setCropIndex(i); setActiveIndex(null) }}
                      className="p-1.5 rounded-full text-white hover:text-gold-400"
                      title="Crop photo"
                    >
                      <Crop className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); remove(i) }}
                    className="p-1.5 rounded-full text-white hover:text-red-400"
                    title="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {/* Indicators */}
                <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                  {isProfile && !isActive && (
                    <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                  )}
                  {hasCrop && !isActive && (
                    <Crop className="w-3 h-3 text-gold-400" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="flex gap-2">
        <label className="flex-1 flex items-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-gold-400 transition text-sm text-neutral-500">
          <Upload className="w-4 h-4" />
          {uploading ? 'Uploading...' : `Upload ${label.toLowerCase()}`}
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
        {availableExisting.length > 0 && (
          <button
            type="button"
            onClick={() => setShowExisting(!showExisting)}
            className={`flex items-center gap-1.5 px-3 py-2 border-2 border-dashed rounded-lg text-sm transition ${
              showExisting ? 'border-gold-400 text-gold-400' : 'border-neutral-700 text-neutral-500 hover:border-gold-400'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Existing
          </button>
        )}
      </div>

      {showExisting && availableExisting.length > 0 && (
        <div className="mt-2 p-2 bg-neutral-800 rounded-lg">
          <p className="text-xs text-neutral-500 mb-2">Tap to add an existing styling photo</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-40 overflow-y-auto">
            {availableExisting.map(url => (
              <button
                key={url}
                type="button"
                onClick={() => addExisting(url)}
                className="aspect-square rounded-lg overflow-hidden border-2 border-neutral-700 hover:border-gold-400 transition"
              >
                <img src={url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {cropIndex !== null && urls[cropIndex] && onCropPhoto && (
        <ImageCropper
          imageUrl={urls[cropIndex]}
          initialCrop={photoCrops?.[String(cropIndex)] ?? null}
          aspect={1}
          onSave={(crop) => { onCropPhoto(cropIndex, crop); setCropIndex(null) }}
          onCancel={() => setCropIndex(null)}
        />
      )}
    </div>
  )
}
