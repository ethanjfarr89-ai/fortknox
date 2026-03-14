import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import type { StylingBoard, JewelryPiece } from '../types'
import PhotoManager from './PhotoManager'
import Lightbox from './Lightbox'

interface Props {
  boards: StylingBoard[]
  pieces: JewelryPiece[]
  onAdd: (name: string, pieceIds: string[], photoUrls: string[], description?: string) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
}

export default function StylingBoards({ boards, pieces, onAdd, onDelete }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPieces, setSelectedPieces] = useState<string[]>([])
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const collectionPieces = pieces.filter(p => !p.is_wishlist)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onAdd(name.trim(), selectedPieces, photoUrls, description.trim())
    setName('')
    setDescription('')
    setSelectedPieces([])
    setPhotoUrls([])
    setShowForm(false)
    setSaving(false)
  }

  const togglePiece = (id: string) => {
    setSelectedPieces(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id])
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Styling Boards</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
        >
          <Plus className="w-4 h-4" /> New Board
        </button>
      </div>

      {boards.length === 0 && !showForm && (
        <div className="text-center py-12 text-neutral-500 text-sm">
          Create styling boards to organize outfits and see how pieces look together.
        </div>
      )}

      {/* Boards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {boards.map(board => {
          const boardPieces = collectionPieces.filter(p => board.piece_ids?.includes(p.id))
          return (
            <div key={board.id} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
              {/* Board photos */}
              {board.photo_urls?.length > 0 ? (
                <div className="grid grid-cols-2 gap-0.5 aspect-video overflow-hidden">
                  {board.photo_urls.slice(0, 4).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition"
                      onClick={() => setLightbox({ photos: board.photo_urls, index: i })}
                    />
                  ))}
                </div>
              ) : (
                <div className="aspect-video bg-neutral-800 flex items-center justify-center">
                  <span className="text-neutral-600 text-sm">No photos</span>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">{board.name}</h3>
                  <button
                    onClick={() => { if (window.confirm('Delete this board?')) onDelete(board.id) }}
                    className="p-1 hover:bg-neutral-800 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400" />
                  </button>
                </div>
                {board.description && <p className="text-xs text-neutral-500 mb-2">{board.description}</p>}

                {boardPieces.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {boardPieces.map(p => (
                      <span key={p.id} className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">{p.name}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* New board form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
          <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-800">
            <div className="flex items-center justify-between p-5 border-b border-neutral-800">
              <h2 className="text-lg font-semibold text-white">New Styling Board</h2>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-neutral-800 rounded-lg transition">
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Name *</label>
                <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Date Night Stack" />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className={inputCls} placeholder="Optional notes..." />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-2">Select Pieces</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {collectionPieces.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => togglePiece(p.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition ${
                        selectedPieces.includes(p.id)
                          ? 'bg-gold-400/15 text-gold-400 border border-gold-400/30'
                          : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                      }`}
                    >
                      {p.photo_urls?.[0] && (
                        <img src={p.photo_urls[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                      )}
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <PhotoManager label="Styling Photos" urls={photoUrls} onChange={setPhotoUrls} />
            </div>

            <div className="flex gap-3 p-5 border-t border-neutral-800">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-neutral-700 text-neutral-400 font-medium rounded-lg hover:bg-neutral-800 transition text-sm">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="flex-1 py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50 text-sm"
              >
                {saving ? 'Saving...' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lightbox && <Lightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />}
    </div>
  )
}
