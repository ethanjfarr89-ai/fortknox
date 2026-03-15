import { X, User } from 'lucide-react'
import type { Friendship } from '../types'
import { useScrollLock } from '../lib/useScrollLock'
import CroppedImage from './CroppedImage'

interface Props {
  collectionName: string
  friends: Friendship[]
  userId: string
  sharedWith: string[]
  onShare: (friendId: string) => Promise<{ error: unknown }>
  onUnshare: (friendId: string) => Promise<{ error: unknown }>
  onClose: () => void
}

export default function CollectionSharePicker({ collectionName, friends, userId, sharedWith, onShare, onUnshare, onClose }: Props) {
  useScrollLock()

  const sharedSet = new Set(sharedWith)

  const getFriendUserId = (f: Friendship) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Share "{collectionName}"</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Choose which friends can see this collection</p>
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
              const isShared = sharedSet.has(friendId)

              return (
                <button
                  key={f.id}
                  onClick={() => isShared ? onUnshare(friendId) : onShare(friendId)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-800 transition"
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
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
