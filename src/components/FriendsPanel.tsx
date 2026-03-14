import { useState } from 'react'
import { UserPlus, Check, X, Trash2, Users } from 'lucide-react'
import type { Friendship } from '../types'

interface Props {
  friends: Friendship[]
  pending: Friendship[]
  userId: string
  onSendRequest: (query: string) => Promise<{ error: unknown }>
  onRespond: (friendshipId: string, accept: boolean) => Promise<void>
  onRemove: (friendshipId: string) => Promise<void>
  onClose: () => void
}

export default function FriendsPanel({ friends, pending, userId, onSendRequest, onRespond, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const incomingRequests = pending.filter(f => f.addressee_id === userId)
  const outgoingRequests = pending.filter(f => f.requester_id === userId)

  const handleSend = async () => {
    if (!query.trim()) return
    setSending(true)
    setError(null)
    const { error } = await onSendRequest(query.trim())
    if (error) setError((error as { message?: string }).message ?? 'Failed to send request')
    else setQuery('')
    setSending(false)
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

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
          {/* Add friend */}
          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Add Friend</label>
            <div className="flex gap-2">
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                className={inputCls}
                placeholder="Display name"
              />
              <button
                onClick={handleSend}
                disabled={sending || !query.trim()}
                className="px-3 py-2 bg-gold-400 hover:bg-gold-300 text-black rounded-lg transition disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
              </button>
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
                    <span className="text-sm text-white">{f.friend_profile?.display_name ?? 'Unknown'}</span>
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
                    <span className="text-sm text-neutral-300">{f.friend_profile?.display_name ?? 'Unknown'}</span>
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
              <p className="text-xs text-neutral-500">No friends yet. Add someone by their display name!</p>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <div key={f.id} className="flex items-center justify-between bg-neutral-800 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-medium text-gold-400">
                        {(f.friend_profile?.display_name ?? '?')[0]?.toUpperCase()}
                      </div>
                      <span className="text-sm text-white">{f.friend_profile?.display_name ?? 'Unknown'}</span>
                    </div>
                    <button
                      onClick={() => { if (window.confirm('Remove friend?')) onRemove(f.id) }}
                      className="p-1 hover:bg-neutral-700 rounded transition"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
