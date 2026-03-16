import { useState } from 'react'
import { Plus, Trash2, X, Share2, ChevronDown, ChevronUp, User, Gem, Package, Pencil, FolderOpen, Users } from 'lucide-react'
import type { Collection, Friendship, JewelryPiece, CollectionShare } from '../types'
import { useScrollLock } from '../lib/useScrollLock'
import CroppedImage from './CroppedImage'

interface Props {
  collections: Collection[]
  pieces: JewelryPiece[]
  pieceCollectionMap: Record<string, string[]>
  friends: Friendship[]
  userId: string
  shares: Record<string, CollectionShare[]>
  onAdd: (name: string, description?: string) => Promise<{ error: unknown }>
  onRename: (id: string, newName: string) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onAssignPiece: (pieceId: string, collectionId: string) => Promise<{ error: unknown }>
  onUnassignPiece: (pieceId: string, collectionId: string) => Promise<{ error: unknown }>
  onShare: (collectionId: string, friendId: string) => Promise<{ error: unknown }>
  onUnshare: (collectionId: string, friendId: string) => Promise<{ error: unknown }>
  onClose: () => void
}

type ExpandTab = 'pieces' | 'sharing'

export default function CollectionManager({ collections, pieces, pieceCollectionMap, friends, userId, shares, onAdd, onRename, onDelete, onAssignPiece, onUnassignPiece, onShare, onUnshare, onClose }: Props) {
  useScrollLock()
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandTab, setExpandTab] = useState<ExpandTab>('pieces')
  const [error, setError] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const handleAdd = async () => {
    if (!name.trim()) return
    setAdding(true)
    setError(null)
    try {
      const result = await onAdd(name.trim())
      if (result?.error) {
        setError((result.error as { message?: string })?.message ?? 'Failed to create collection')
      } else {
        setName('')
      }
    } catch {
      setError('Unexpected error creating collection')
    }
    setAdding(false)
  }

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      setExpandTab('pieces')
    }
  }

  const startRename = (c: Collection, e: React.MouseEvent) => {
    e.stopPropagation()
    setRenamingId(c.id)
    setRenameValue(c.name)
  }

  const submitRename = async (id: string) => {
    if (renameValue.trim() && renameValue.trim() !== collections.find(c => c.id === id)?.name) {
      await onRename(id, renameValue.trim())
    }
    setRenamingId(null)
  }

  const getFriendProfile = (f: Friendship) => f.friend_profile
  const getFriendUserId = (f: Friendship) =>
    f.requester_id === userId ? f.addressee_id : f.requester_id

  // Get pieces assigned to a collection
  const getPiecesInCollection = (collectionId: string) => {
    return pieces.filter(p => (pieceCollectionMap[p.id] ?? []).includes(collectionId))
  }

  const trovePieces = pieces.filter(p => !p.is_wishlist)

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <h2 className="text-lg font-semibold text-white">Manage Collections</h2>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Create new collection */}
          <div className="flex gap-2">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className={inputCls}
              placeholder="New collection name"
            />
            <button
              onClick={handleAdd}
              disabled={adding || !name.trim()}
              className="px-3 py-2 bg-gold-400 hover:bg-gold-300 text-black rounded-lg transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          <p className="text-xs text-neutral-500">Collections are subsets of your Trove. Add pieces to a collection, then share it with specific friends.</p>

          {/* Collection list */}
          <div className="space-y-2">
            {collections.length === 0 ? (
              <div className="text-center py-8">
                <FolderOpen className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                <p className="text-sm text-neutral-500">No collections yet.</p>
                <p className="text-xs text-neutral-600 mt-1">Create one above to organize and share your pieces.</p>
              </div>
            ) : (
              collections.map(c => {
                const sharedWith = shares[c.id] ?? []
                const piecesInCollection = getPiecesInCollection(c.id)
                const isExpanded = expandedId === c.id

                return (
                  <div key={c.id} className="bg-neutral-800 rounded-lg overflow-hidden">
                    {/* Collection header */}
                    <div
                      onClick={() => { if (renamingId !== c.id) toggleExpand(c.id) }}
                      className="w-full flex items-center justify-between p-3 hover:bg-neutral-700/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 text-left min-w-0">
                        {renamingId === c.id ? (
                          <input
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') submitRename(c.id); if (e.key === 'Escape') setRenamingId(null) }}
                            onBlur={() => submitRename(c.id)}
                            onClick={e => e.stopPropagation()}
                            autoFocus
                            className="text-sm text-white font-medium bg-neutral-700 border border-neutral-600 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-gold-400 w-32"
                          />
                        ) : (
                          <span className="text-sm text-white font-medium truncate">{c.name}</span>
                        )}
                        <span className="text-xs text-neutral-500 shrink-0">{piecesInCollection.length} pieces</span>
                        {sharedWith.length > 0 && (
                          <span className="text-xs text-gold-400 shrink-0">{sharedWith.length} shared</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={e => startRename(c, e)}
                          className="p-1.5 hover:bg-neutral-600 rounded transition"
                          title="Rename"
                        >
                          <Pencil className="w-3.5 h-3.5 text-neutral-500 hover:text-white" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); if (window.confirm(`Delete "${c.name}"?`)) onDelete(c.id) }}
                          className="p-1.5 hover:bg-neutral-600 rounded transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                        </button>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-neutral-500" /> : <ChevronDown className="w-3.5 h-3.5 text-neutral-500" />}
                      </div>
                    </div>

                    {/* Expanded panel */}
                    {isExpanded && (
                      <div className="border-t border-neutral-700">
                        {/* Tabs */}
                        <div className="flex border-b border-neutral-700">
                          <button
                            onClick={() => setExpandTab('pieces')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                              expandTab === 'pieces' ? 'text-gold-400 border-b-2 border-gold-400' : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            <Package className="w-3.5 h-3.5" /> Pieces
                          </button>
                          <button
                            onClick={() => setExpandTab('sharing')}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                              expandTab === 'sharing' ? 'text-gold-400 border-b-2 border-gold-400' : 'text-neutral-500 hover:text-neutral-300'
                            }`}
                          >
                            <Share2 className="w-3.5 h-3.5" /> Sharing
                          </button>
                        </div>

                        {/* Pieces tab */}
                        {expandTab === 'pieces' && (
                          <div className="p-3 space-y-1.5 max-h-60 overflow-y-auto">
                            {trovePieces.length === 0 ? (
                              <div className="text-center py-8">
                                <Gem className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                                <p className="text-sm text-neutral-500">Add pieces to your Trove first.</p>
                              </div>
                            ) : (
                              trovePieces.map(piece => {
                                const isAssigned = (pieceCollectionMap[piece.id] ?? []).includes(c.id)
                                const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]

                                return (
                                  <button
                                    key={piece.id}
                                    onClick={() => isAssigned ? onUnassignPiece(piece.id, c.id) : onAssignPiece(piece.id, c.id)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-700/50 transition"
                                  >
                                    {photoUrl ? (
                                      <CroppedImage
                                        src={photoUrl}
                                        alt=""
                                        crop={piece.profile_photo_crop}
                                        className="w-8 h-8 rounded object-cover border border-neutral-600 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-neutral-700 flex items-center justify-center shrink-0">
                                        <Gem className="w-3.5 h-3.5 text-neutral-400" />
                                      </div>
                                    )}
                                    <span className="text-sm text-white truncate flex-1 text-left">{piece.name}</span>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
                                      isAssigned ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                                    }`}>
                                      {isAssigned && (
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
                        )}

                        {/* Sharing tab */}
                        {expandTab === 'sharing' && (
                          <div className="p-3 space-y-1.5">
                            {friends.length === 0 ? (
                              <div className="text-center py-8">
                                <Users className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                                <p className="text-sm text-neutral-500">Add friends first to share collections.</p>
                              </div>
                            ) : (
                              friends.map(f => {
                                const friendId = getFriendUserId(f)
                                const friendProfile = getFriendProfile(f)
                                const isShared = sharedWith.some(s => s.friend_id === friendId)

                                return (
                                  <button
                                    key={f.id}
                                    onClick={() => isShared ? onUnshare(c.id, friendId) : onShare(c.id, friendId)}
                                    className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-700/50 transition"
                                  >
                                    {friendProfile?.avatar_url ? (
                                      <CroppedImage
                                        src={friendProfile.avatar_url}
                                        alt=""
                                        crop={friendProfile.avatar_crop}
                                        className="w-7 h-7 rounded-full object-cover border border-neutral-600 shrink-0"
                                      />
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-neutral-700 flex items-center justify-center shrink-0">
                                        <User className="w-3 h-3 text-neutral-400" />
                                      </div>
                                    )}
                                    <span className="text-sm text-white truncate flex-1 text-left">
                                      {friendProfile?.display_name ?? 'Unknown'}
                                    </span>
                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${
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
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
