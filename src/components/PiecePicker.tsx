import { useState } from 'react'
import { X, Gem, Search } from 'lucide-react'
import type { JewelryPiece } from '../types'
import { useScrollLock } from '../lib/useScrollLock'
import CroppedImage from './CroppedImage'

interface Props {
  collectionName: string
  pieces: JewelryPiece[]
  assignedPieceIds: string[]
  onAssign: (pieceId: string) => Promise<{ error: unknown }>
  onUnassign: (pieceId: string) => Promise<{ error: unknown }>
  onClose: () => void
}

export default function PiecePicker({ collectionName, pieces, assignedPieceIds, onAssign, onUnassign, onClose }: Props) {
  useScrollLock()
  const [search, setSearch] = useState('')

  const trovePieces = pieces.filter(p => !p.is_wishlist)
  const filtered = search.trim()
    ? trovePieces.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.metal_type.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase())
      )
    : trovePieces

  const assignedSet = new Set(assignedPieceIds)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <div>
            <h2 className="text-lg font-semibold text-white">Add to "{collectionName}"</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Select pieces from your Trove</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-4 border-b border-neutral-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500"
              placeholder="Search your Trove..."
              autoComplete="off"
            />
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-1">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-neutral-500 py-8">
              {trovePieces.length === 0 ? 'No pieces in your Trove yet.' : 'No pieces match your search.'}
            </p>
          ) : (
            filtered.map(piece => {
              const isAssigned = assignedSet.has(piece.id)
              const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]

              return (
                <button
                  key={piece.id}
                  onClick={() => isAssigned ? onUnassign(piece.id) : onAssign(piece.id)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-neutral-800 transition"
                >
                  {photoUrl ? (
                    <CroppedImage
                      src={photoUrl}
                      alt=""
                      crop={piece.profile_photo_crop}
                      className="w-10 h-10 rounded-lg object-cover border border-neutral-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0 border border-neutral-700">
                      <Gem className="w-4 h-4 text-neutral-500" />
                    </div>
                  )}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm text-white truncate">{piece.name}</p>
                    <p className="text-xs text-neutral-500 truncate">{piece.category}</p>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 ${
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
      </div>
    </div>
  )
}
