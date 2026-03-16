import { useMemo, useState } from 'react'
import { Plus, Trash2, X, Check, Image as ImageIcon, Tag, Search } from 'lucide-react'
import type { StylingBoard, JewelryPiece, JewelryPieceInsert } from '../types'
import PhotoManager from './PhotoManager'
import Lightbox from './Lightbox'

interface Props {
  boards: StylingBoard[]
  pieces: JewelryPiece[]
  onAdd: (name: string, pieceIds: string[], photoUrls: string[], description?: string) => Promise<{ error: unknown }>
  onDelete: (id: string) => Promise<{ error: unknown }>
  onUpdatePiece: (id: string, updates: Partial<JewelryPieceInsert>) => Promise<{ error: unknown }>
}

interface StylingPhoto {
  url: string
  pieceIds: string[]
}

export default function StylingBoards({ boards, pieces, onAdd, onDelete, onUpdatePiece }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [boardPhotoUrls, setBoardPhotoUrls] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [selectedForBoard, setSelectedForBoard] = useState<Set<string>>(new Set())
  const [viewingPhoto, setViewingPhoto] = useState<StylingPhoto | null>(null)
  const [showTagPicker, setShowTagPicker] = useState(false)
  const [tagSearch, setTagSearch] = useState('')

  const collectionPieces = pieces.filter(p => !p.is_wishlist)

  // Build gallery: all unique styling photos across all pieces, mapped to their pieces
  const gallery = useMemo(() => {
    const photoMap = new Map<string, Set<string>>()
    for (const piece of pieces) {
      if (!piece.styling_photo_urls?.length) continue
      for (const url of piece.styling_photo_urls) {
        if (!photoMap.has(url)) photoMap.set(url, new Set())
        photoMap.get(url)!.add(piece.id)
      }
    }
    const result: StylingPhoto[] = []
    for (const [url, pieceIds] of photoMap) {
      result.push({ url, pieceIds: Array.from(pieceIds) })
    }
    return result
  }, [pieces])

  const toggleSelectPhoto = (url: string) => {
    setSelectedForBoard(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const startBoardFromSelection = () => {
    setBoardPhotoUrls(Array.from(selectedForBoard))
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    // Find all pieces connected to the selected photos
    const pieceIdSet = new Set<string>()
    for (const url of boardPhotoUrls) {
      const photo = gallery.find(p => p.url === url)
      if (photo) photo.pieceIds.forEach(id => pieceIdSet.add(id))
    }
    await onAdd(name.trim(), Array.from(pieceIdSet), boardPhotoUrls, description.trim())
    setName('')
    setDescription('')
    setBoardPhotoUrls([])
    setSelectedForBoard(new Set())
    setShowForm(false)
    setSaving(false)
  }

  const tagPiece = async (piece: JewelryPiece, photoUrl: string) => {
    const current = piece.styling_photo_urls ?? []
    if (current.includes(photoUrl)) return
    await onUpdatePiece(piece.id, { styling_photo_urls: [...current, photoUrl] })
    // Update viewingPhoto to include the new piece
    if (viewingPhoto) {
      setViewingPhoto({ ...viewingPhoto, pieceIds: [...viewingPhoto.pieceIds, piece.id] })
    }
  }

  const untagPiece = async (piece: JewelryPiece, photoUrl: string) => {
    const current = piece.styling_photo_urls ?? []
    await onUpdatePiece(piece.id, { styling_photo_urls: current.filter(u => u !== photoUrl) })
    if (viewingPhoto) {
      setViewingPhoto({ ...viewingPhoto, pieceIds: viewingPhoto.pieceIds.filter(id => id !== piece.id) })
    }
  }

  const inputCls = 'w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500'

  return (
    <div className="space-y-6">
      {/* Styling Gallery */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Styling Gallery</h2>
          <div className="flex items-center gap-2">
            {selectedForBoard.size > 0 && (
              <button
                onClick={startBoardFromSelection}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Create Board ({selectedForBoard.size})
              </button>
            )}
          </div>
        </div>

        {gallery.length === 0 ? (
          <div className="text-center py-12 bg-neutral-900 rounded-xl border border-neutral-800">
            <ImageIcon className="w-10 h-10 text-neutral-700 mx-auto mb-2" />
            <p className="text-sm text-neutral-500">No styling photos yet.</p>
            <p className="text-xs text-neutral-600 mt-1">Add styling photos when editing a piece to build your gallery.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {gallery.map(photo => {
              const isSelected = selectedForBoard.has(photo.url)
              const piecesInPhoto = collectionPieces.filter(p => photo.pieceIds.includes(p.id))
              return (
                <div
                  key={photo.url}
                  className={`relative aspect-square rounded-lg overflow-hidden group cursor-pointer border-2 transition ${
                    isSelected ? 'border-gold-400' : 'border-transparent hover:border-neutral-600'
                  }`}
                >
                  <img
                    src={photo.url}
                    alt=""
                    className="w-full h-full object-cover"
                    onClick={() => setViewingPhoto(photo)}
                  />
                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectPhoto(photo.url) }}
                    className={`absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center transition ${
                      isSelected
                        ? 'bg-gold-400 text-black'
                        : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </button>
                  {/* Piece count badge */}
                  {piecesInPhoto.length > 0 && (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-neutral-300">
                      {piecesInPhoto.length} piece{piecesInPhoto.length !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Styling Boards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Styling Boards</h2>
          <button
            onClick={() => { setSelectedForBoard(new Set()); setBoardPhotoUrls([]); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            <Plus className="w-4 h-4" /> New Board
          </button>
        </div>

        {boards.length === 0 && (
          <div className="text-center py-8 text-neutral-500 text-sm bg-neutral-900 rounded-xl border border-neutral-800">
            Select photos from the gallery above and create a board, or click "New Board" to start fresh.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map(board => {
            const boardPieces = collectionPieces.filter(p => board.piece_ids?.includes(p.id))
            return (
              <div key={board.id} className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden">
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
      </div>

      {/* Photo detail modal */}
      {viewingPhoto && (() => {
        const taggedPieces = collectionPieces.filter(p => viewingPhoto.pieceIds.includes(p.id))
        const untaggedPieces = collectionPieces.filter(p => !viewingPhoto.pieceIds.includes(p.id))
        const filteredUntagged = tagSearch
          ? untaggedPieces.filter(p => p.name.toLowerCase().includes(tagSearch.toLowerCase()))
          : untaggedPieces

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
            <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md border border-neutral-800">
              <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                <h3 className="text-sm font-semibold text-white">Styling Photo</h3>
                <button onClick={() => { setViewingPhoto(null); setShowTagPicker(false); setTagSearch('') }} className="p-1 hover:bg-neutral-800 rounded-lg transition">
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              <div className="p-4 max-h-[80vh] overflow-y-auto">
                <img
                  src={viewingPhoto.url}
                  alt=""
                  className="w-full rounded-lg mb-4 cursor-pointer"
                  onClick={() => setLightbox({ photos: [viewingPhoto.url], index: 0 })}
                />
                <h4 className="text-xs font-medium text-neutral-400 mb-2">Tagged pieces</h4>
                {taggedPieces.length === 0 ? (
                  <p className="text-xs text-neutral-600 mb-3">No pieces tagged yet.</p>
                ) : (
                  <div className="space-y-1.5 mb-3">
                    {taggedPieces.map(p => (
                      <div key={p.id} className="flex items-center gap-2 px-3 py-2 bg-neutral-800 rounded-lg group/tag">
                        {p.photo_urls?.[0] && (
                          <img src={p.photo_urls[0]} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <span className="text-sm text-neutral-300 truncate flex-1">{p.name}</span>
                        <button
                          onClick={() => untagPiece(p, viewingPhoto.url)}
                          className="p-1 text-neutral-600 hover:text-red-400 opacity-0 group-hover/tag:opacity-100 transition shrink-0"
                          title="Remove tag"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tag a piece button / picker */}
                {!showTagPicker ? (
                  <button
                    onClick={() => setShowTagPicker(true)}
                    className="flex items-center gap-2 w-full px-3 py-2.5 border border-dashed border-neutral-700 rounded-lg text-sm text-neutral-400 hover:border-gold-400/40 hover:text-gold-400 transition"
                  >
                    <Tag className="w-4 h-4" />
                    Tag a piece
                  </button>
                ) : (
                  <div className="border border-neutral-700 rounded-lg overflow-hidden">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-500" />
                      <input
                        type="text"
                        value={tagSearch}
                        onChange={e => setTagSearch(e.target.value)}
                        placeholder="Search pieces..."
                        className="w-full pl-9 pr-3 py-2 bg-neutral-800 border-b border-neutral-700 text-sm text-white placeholder-neutral-500 outline-none focus:ring-1 focus:ring-gold-400"
                        autoFocus
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredUntagged.length === 0 ? (
                        <p className="text-xs text-neutral-600 p-3 text-center">
                          {untaggedPieces.length === 0 ? 'All pieces are tagged' : 'No matches'}
                        </p>
                      ) : (
                        filteredUntagged.map(p => (
                          <button
                            key={p.id}
                            onClick={() => tagPiece(p, viewingPhoto.url)}
                            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-neutral-800 transition text-left"
                          >
                            {p.photo_urls?.[0] ? (
                              <img src={p.photo_urls[0]} alt="" className="w-7 h-7 rounded object-cover shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded bg-neutral-700 shrink-0" />
                            )}
                            <span className="text-sm text-neutral-300 truncate">{p.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      onClick={() => { setShowTagPicker(false); setTagSearch('') }}
                      className="w-full px-3 py-2 text-xs text-neutral-500 hover:text-neutral-300 border-t border-neutral-700 transition"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })()}

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

              {/* Selected gallery photos */}
              {boardPhotoUrls.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Selected Photos</label>
                  <div className="flex gap-2 flex-wrap">
                    {boardPhotoUrls.map(url => (
                      <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setBoardPhotoUrls(prev => prev.filter(u => u !== url))}
                          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pick from gallery */}
              {gallery.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-neutral-400 mb-2">Add from Gallery</label>
                  <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                    {gallery.filter(p => !boardPhotoUrls.includes(p.url)).map(photo => (
                      <button
                        key={photo.url}
                        type="button"
                        onClick={() => setBoardPhotoUrls(prev => [...prev, photo.url])}
                        className="aspect-square rounded-lg overflow-hidden border border-neutral-700 hover:border-gold-400 transition"
                      >
                        <img src={photo.url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <PhotoManager label="Upload New Photos" urls={[]} onChange={(newUrls) => setBoardPhotoUrls(prev => [...prev, ...newUrls])} />
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
