import { useState } from 'react'
import { X, Upload, Star, Crop } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { CropArea } from '../types'
import ImageCropper from './ImageCropper'

interface Props {
  label: string
  urls: string[]
  onChange: (urls: string[]) => void
  profileIndex?: number
  onSetProfile?: (index: number) => void
  onCropProfile?: (crop: CropArea) => void
  profileCrop?: CropArea | null
  showProfileSelect?: boolean
}

export default function PhotoManager({ label, urls, onChange, profileIndex, onSetProfile, onCropProfile, profileCrop, showProfileSelect }: Props) {
  const [uploading, setUploading] = useState(false)
  const [cropIndex, setCropIndex] = useState<number | null>(null)

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
    // Adjust profile index if needed
    if (showProfileSelect && onSetProfile && profileIndex !== undefined) {
      if (index === profileIndex) {
        onSetProfile(0)
      } else if (index < profileIndex) {
        onSetProfile(profileIndex - 1)
      }
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-400 mb-1">{label}</label>
      {urls.length > 0 && (
        <div className="flex gap-2 mb-2 flex-wrap">
          {urls.map((url, i) => (
            <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden group">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition">
                {showProfileSelect && onSetProfile && (
                  <>
                    <button
                      type="button"
                      onClick={() => onSetProfile(i)}
                      className={`p-1 rounded ${i === profileIndex ? 'text-gold-400' : 'text-white hover:text-gold-400'}`}
                      title="Set as profile photo"
                    >
                      <Star className={`w-4 h-4 ${i === profileIndex ? 'fill-gold-400' : ''}`} />
                    </button>
                    {i === profileIndex && onCropProfile && (
                      <button
                        type="button"
                        onClick={() => setCropIndex(i)}
                        className="p-1 text-white hover:text-gold-400 rounded"
                        title="Crop profile photo"
                      >
                        <Crop className="w-4 h-4" />
                      </button>
                    )}
                  </>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1 text-white hover:text-red-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              {showProfileSelect && i === profileIndex && (
                <div className="absolute top-0.5 left-0.5">
                  <Star className="w-3 h-3 text-gold-400 fill-gold-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-neutral-700 rounded-lg cursor-pointer hover:border-gold-400 transition text-sm text-neutral-500">
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

      {cropIndex !== null && urls[cropIndex] && onCropProfile && (
        <ImageCropper
          imageUrl={urls[cropIndex]}
          initialCrop={profileCrop}
          aspect={1}
          onSave={(crop) => { onCropProfile(crop); setCropIndex(null) }}
          onCancel={() => setCropIndex(null)}
        />
      )}
    </div>
  )
}
