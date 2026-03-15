import { useCallback, useEffect, useState } from 'react'
import { UserPlus, Check, X, Users, ChevronRight, User } from 'lucide-react'
import type { Friendship, UserProfile } from '../types'

interface Props {
  friends: Friendship[]
  pending: Friendship[]
  userId: string
  onSendRequest: (targetUserId: string) => Promise<{ error: unknown }>
  onSearchProfiles: (query: string) => Promise<UserProfile[]>
  onRespond: (friendshipId: string, accept: boolean) => Promise<void>
  onRemove: (friendshipId: string) => Promise<void>
  onClose: () => void
}

export default function FriendsPanel({ friends, pending, userId, onSendRequest, onSearchProfiles, onRespond, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [viewingFriend, setViewingFriend] = useState<Friendship | null>(null)

  const incomingRequests = pending.filter(f => f.addressee_id === userId)
  const outgoingRequests = pending.filter(f => f.requester_id === userId)

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return }
    setSearching(true)
    const results = await onSearchProfiles(q)
    // Filter out existing friends and pending requests
    const existingIds = new Set([
      ...friends.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id),
      ...pending.map(f => f.requester_id === userId ? f.addressee_id : f.requester_id),
    ])
    setSearchResults(results.filter(r => !existingIds.has(r.id)))
    setSearching(false)
  }, [onSearchProfiles, friends, pending, userId])

  useEffect(() => {
    const timer = setTimeout(() => doSearch(query), 300)
    return () => clearTimeout(timer)
  }, [query, doSearch])

  const handleSend = async (targetUserId: string) => {
    setSending(true)
    setError(null)
    const { error } = await onSendRequest(targetUserId)
    if (error) setError((error as { message?: string }).message ?? 'Failed to send request')
    else { setQuery(''); setSearchResults([]) }
    setSending(false)
  }

  // Friend profile view
  if (viewingFriend) {
    const friendProfile = viewingFriend.friend_profile
    const privacy = friendProfile?.privacy_settings
    const canSee = privacy?.show_pieces !== 'private'
    const canSeeValues = privacy?.show_values !== 'private'
    const canSeePhotos = privacy?.show_photos !== 'private'

    // For now, we don't have access to the friend's pieces from the client
    // This shows their profile info and privacy-allowed details
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
        <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
          <div className="flex items-center justify-between p-5 border-b border-neutral-800">
            <button onClick={() => setViewingFriend(null)} className="text-sm text-gold-400 hover:text-gold-300">
              &larr; Back
            </button>
            <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Profile header */}
            <div className="flex flex-col items-center gap-3">
              <div className="w-20 h-20 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700">
                {friendProfile?.avatar_url ? (
                  <img src={friendProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gold-400">
                    {(friendProfile?.display_name ?? '?')[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h3 className="text-lg font-semibold text-white">{friendProfile?.display_name ?? 'Unknown'}</h3>
            </div>

            {/* Privacy-based content */}
            {!canSee ? (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-500">This user's collection is private.</p>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-neutral-500">Collection viewing coming soon.</p>
                <p className="text-xs text-neutral-600 mt-1">
                  {canSeeValues ? 'Values visible' : 'Values hidden'} &middot; {canSeePhotos ? 'Photos visible' : 'Photos hidden'}
                </p>
              </div>
            )}

            <button
              onClick={() => { if (window.confirm('Remove friend?')) { onRemove(viewingFriend.id); setViewingFriend(null) } }}
              className="w-full py-2.5 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/20 transition"
            >
              Remove Friend
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-sm border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-gold-400" /> Friends
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Add friend with autocomplete */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Add Friend</label>
            <div className="relative">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500"
                placeholder="Search by display name..."
              />
              {/* Autocomplete dropdown */}
              {query.trim().length >= 2 && (searchResults.length > 0 || searching) && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
                  {searching ? (
                    <div className="px-3 py-2.5 text-xs text-neutral-500">Searching...</div>
                  ) : (
                    searchResults.map(profile => (
                      <button
                        key={profile.id}
                        onClick={() => handleSend(profile.id)}
                        disabled={sending}
                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-neutral-700 transition text-left"
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-neutral-600" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5 text-neutral-400" />
                          </div>
                        )}
                        <span className="text-sm text-white truncate">{profile.display_name}</span>
                        <UserPlus className="w-3.5 h-3.5 text-gold-400 ml-auto shrink-0" />
                      </button>
                    ))
                  )}
                  {!searching && searchResults.length === 0 && query.trim().length >= 2 && (
                    <div className="px-3 py-2.5 text-xs text-neutral-500">No users found</div>
                  )}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>

          {/* Incoming requests */}
          {incomingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-2">Friend Requests</h3>
              <div className="space-y-2">
                {incomingRequests.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {f.friend_profile?.avatar_url ? (
                        <img src={f.friend_profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      )}
                      <span className="text-sm text-white">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => onRespond(f.id, true)} className="p-1.5 bg-emerald-900/30 hover:bg-emerald-900/50 rounded-lg transition">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                      <button onClick={() => onRespond(f.id, false)} className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded-lg transition">
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Outgoing */}
          {outgoingRequests.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-neutral-400 mb-2">Pending</h3>
              <div className="space-y-2">
                {outgoingRequests.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      {f.friend_profile?.avatar_url ? (
                        <img src={f.friend_profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-neutral-400" />
                        </div>
                      )}
                      <span className="text-sm text-neutral-300">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                    </div>
                    <span className="text-xs text-neutral-500">Pending</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends list */}
          <div>
            <h3 className="text-sm font-medium text-neutral-400 mb-2">Friends ({friends.length})</h3>
            {friends.length === 0 ? (
              <p className="text-xs text-neutral-500">No friends yet. Search by display name to add someone!</p>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setViewingFriend(f)}
                    className="w-full flex items-center justify-between bg-neutral-800 rounded-lg p-3 hover:bg-neutral-750 transition"
                  >
                    <div className="flex items-center gap-2">
                      {f.friend_profile?.avatar_url ? (
                        <img src={f.friend_profile.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover border border-neutral-600" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium text-gold-400">
                          {(f.friend_profile?.display_name ?? '?')[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="text-sm text-white">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-neutral-600" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
