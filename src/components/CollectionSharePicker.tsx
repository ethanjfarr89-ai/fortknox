import { useState } from 'react'
import { X, User, ChevronDown, ChevronUp } from 'lucide-react'
import type { Friendship, CollectionShare, CardDisplayPrefs } from '../types'
import { useScrollLock } from '../lib/useScrollLock'
import CroppedImage from './CroppedImage'

interface Props {
  collectionName: string
  friends: Friendship[]
  userId: string
  sharedWith: CollectionShare[]
  onShare: (friendId: string) => Promise<{ error: unknown }>
  onUnshare: (friendId: string) => Promise<{ error: unknown }>
  onUpdatePrefs: (friendId: string, prefs: CardDisplayPrefs) => Promise<{ error: unknown }>
  onClose: () => void
}

const PREF_LABELS: [keyof CardDisplayPrefs, string][] = [
  ['value', 'Value'],
  ['roi', 'ROI / Change'],
  ['weight', 'Weight'],
  ['metal', 'Metal & Karat'],
  ['category', 'Category'],
  ['gemstones', 'Gemstones'],
]

export default function CollectionSharePicker({ collectionName, friends, userId, sharedWith, onShare, onUnshare, onUpdatePrefs, onClose }: Props) {
  useScrollLock()
  const [expanded, setExpanded] = useState<string | null>(null)

  const shareMap = new Map(sharedWith.map(s => [s.friend_id, s]))

  const getFriendUserId = (f: Friendship) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id

  const togglePref = (friendId: string, key: keyof CardDisplayPrefs) => {
    const share = shareMap.get(friendId)
    if (!share) return
    const next = { ...share.display_prefs, [key]: !share.display_prefs[key] }
    onUpdatePrefs(friendId, next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Share "{collectionName}"</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Choose who can see this collection and what they see</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
          {friends.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-8">
              Add friends first to share collections.
            </p>
          ) : (
            friends.map(f => {
              const friendId = getFriendUserId(f)
              const friendProfile = f.friend_profile
              const share = shareMap.get(friendId)
              const isShared = !!share
              const isExpanded = expanded === friendId

              return (
                <div key={f.id} className="rounded-lg overflow-hidden">
                  <div className="flex items-center gap-3 p-2.5 hover:bg-neutral-800 transition">
                    <button
                      onClick={() => isShared ? onUnshare(friendId) : onShare(friendId)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      {friendProfile?.avatar_url ? (
                        <CroppedImage
                          src={friendProfile.avatar_url}
                          alt=""
                          crop={friendProfile.avatar_crop}
                          className="w-9 h-9 rounded-full object-cover border border-neutral-600 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-neutral-400" />
                        </div>
                      )}
                      <span className="text-sm text-white truncate flex-1 text-left">
                        {friendProfile?.display_name ?? 'Unknown'}
                      </span>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 ${
                        isShared ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                      }`}>
                        {isShared && (
                          <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                    {isShared && (
                      <button
                        onClick={() => setExpanded(isExpanded ? null : friendId)}
                        className="p-1 text-neutral-500 hover:text-neutral-300 transition shrink-0"
                        title="Display preferences"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>

                  {/* Per-friend display prefs */}
                  {isShared && isExpanded && (
                    <div className="bg-neutral-800/50 px-4 py-2 space-y-1 border-t border-neutral-800">
                      <p className="text-xs text-neutral-500 mb-1.5">What {friendProfile?.display_name ?? 'they'} can see:</p>
                      {PREF_LABELS.map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => togglePref(friendId, key)}
                          className="w-full flex items-center gap-2 py-1 text-sm text-neutral-300 hover:text-white transition"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                            share!.display_prefs[key] ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                          }`}>
                            {share!.display_prefs[key] && <span className="text-black text-[9px] font-bold">✓</span>}
                          </div>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
