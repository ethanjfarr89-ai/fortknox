import { useState } from 'react'
import { Camera, Save, X } from 'lucide-react'
import type { UserProfile, CropArea } from '../types'
import { supabase } from '../lib/supabase'
import { useScrollLock } from '../lib/useScrollLock'
import ImageCropper from './ImageCropper'
import CroppedImage from './CroppedImage'

interface Props {
  profile: UserProfile
  onUpdate: (updates: { display_name?: string | null; avatar_url?: string | null; avatar_crop?: CropArea | null }) => Promise<{ error: unknown }>
  onClose: () => void
}

export default function ProfileSettings({ profile, onUpdate, onClose }: Props) {
  useScrollLock()
  const [displayName, setDisplayName] = useState(profile.display_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [showCropper, setShowCropper] = useState(false)
  const [avatarCrop, setAvatarCrop] = useState<CropArea | null>(profile.avatar_crop ?? null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${crypto.randomUUID()}.${ext}`

    const { error } = await supabase.storage.from('photos').upload(path, file, { cacheControl: '3600' })
    if (!error) {
      const { data } = supabase.storage.from('photos').getPublicUrl(path)
      setAvatarUrl(data.publicUrl)
      setAvatarCrop(null)
      setShowCropper(true)
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    const { error: saveError } = await onUpdate({
      display_name: displayName.trim() || null,
      avatar_url: avatarUrl || null,
      avatar_crop: avatarCrop,
    })
    setSaving(false)
    if (saveError) {
      setError((saveError as { message?: string }).message ?? 'Failed to save profile')
    } else {
      onClose()
    }
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
        <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
          <div className="flex items-center justify-between p-5 border-b border-neutral-800">
            <h2 className="text-lg font-semibold text-white">My Profile</h2>
            <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {error && <div className="bg-red-900/30 text-red-400 text-sm rounded-lg p-3 border border-red-900/50">{error}</div>}
            {/* Avatar */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700">
                  {avatarUrl ? (
                    <CroppedImage src={avatarUrl} alt="" crop={avatarCrop} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-gold-400">
                      {(displayName || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-1.5 bg-gold-400 rounded-full cursor-pointer hover:bg-gold-300 transition">
                  <Camera className="w-3.5 h-3.5 text-black" />
                  <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              </div>
              {avatarUrl && (
                <button
                  onClick={() => setShowCropper(true)}
                  className="text-xs text-gold-400 hover:text-gold-300"
                >
                  Crop photo
                </button>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Display Name</label>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} className={inputCls} placeholder="Your name" />
              <p className="text-xs text-neutral-600 mt-1">Friends will find you by this name.</p>
            </div>

            <p className="text-xs text-neutral-500">
              Sharing is managed per-collection. Use the collection sharing controls on your dashboard to choose what friends can see.
            </p>
          </div>

          <div className="flex gap-3 p-5 border-t border-neutral-800">
            <button onClick={onClose} className="flex-1 py-2.5 border border-neutral-700 text-neutral-400 font-medium rounded-lg hover:bg-neutral-800 transition text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50 text-sm flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {showCropper && avatarUrl && (
        <ImageCropper
          imageUrl={avatarUrl}
          initialCrop={avatarCrop}
          aspect={1}
          onSave={(crop) => { setAvatarCrop(crop); setShowCropper(false) }}
          onCancel={() => setShowCropper(false)}
        />
      )}
    </>
  )
}
