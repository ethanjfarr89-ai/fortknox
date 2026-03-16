import { useEffect, useState } from 'react'
import { ArrowLeft, Gem, Weight, Sparkles, FolderOpen, Search } from 'lucide-react'
import type { JewelryPiece, SpotPrices, UserProfile, CardDisplayPrefs } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue, calculateGemstoneValue, isGoldType, metalBadgeClasses } from '../lib/prices'
import type { SharedCollection } from '../lib/useFriends'
import CroppedImage from './CroppedImage'
import Lightbox from './Lightbox'

interface Props {
  profile: UserProfile
  prices: SpotPrices
  fetchPieces: (userId: string) => Promise<JewelryPiece[]>
  fetchSharedCollections: (friendUserId: string) => Promise<SharedCollection[]>
  fetchSharedPieceCollections: () => Promise<Record<string, string[]>>
  onRemove: () => void
  onBack: () => void
}

const metalLabels: Record<string, string> = {
  gold: 'Yellow Gold', yellow_gold: 'Yellow Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function FriendProfile({ profile, prices, fetchPieces, fetchSharedCollections, fetchSharedPieceCollections, onRemove, onBack }: Props) {
  const [allPieces, setAllPieces] = useState<JewelryPiece[]>([])
  const [sharedCollections, setSharedCollections] = useState<SharedCollection[]>([])
  const [pieceCollectionMap, setPieceCollectionMap] = useState<Record<string, string[]>>({})
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewingPiece, setViewingPiece] = useState<JewelryPiece | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const load = async () => {
      const [piecesData, collectionsData, pcMap] = await Promise.all([
        fetchPieces(profile.id),
        fetchSharedCollections(profile.id),
        fetchSharedPieceCollections(),
      ])
      setAllPieces(piecesData)
      setSharedCollections(collectionsData)
      setPieceCollectionMap(pcMap)
      // Auto-select first collection if there's only one
      if (collectionsData.length === 1) setSelectedCollection(collectionsData[0].id)
      setLoading(false)
    }
    load()
  }, [profile.id, fetchPieces, fetchSharedCollections, fetchSharedPieceCollections])

  // Get display prefs for the selected collection (or merged prefs across all)
  const getDisplayPrefs = (pieceId: string): CardDisplayPrefs => {
    const colIds = pieceCollectionMap[pieceId] ?? []
    // If a specific collection is selected, use its prefs
    if (selectedCollection) {
      const col = sharedCollections.find(c => c.id === selectedCollection)
      return col?.display_prefs ?? { value: false, roi: false, weight: false, metal: false, category: false, gemstones: false }
    }
    // When viewing "All", merge prefs: show a field if ANY shared collection containing this piece allows it
    const merged: CardDisplayPrefs = { value: false, roi: false, weight: false, metal: false, category: false, gemstones: false }
    for (const cid of colIds) {
      const col = sharedCollections.find(c => c.id === cid)
      if (!col) continue
      for (const key of Object.keys(merged) as (keyof CardDisplayPrefs)[]) {
        if (col.display_prefs[key]) merged[key] = true
      }
    }
    return merged
  }

  // Filter pieces: RLS already filters at DB level, but also only show pieces in shared collections
  const sharedCollectionIds = new Set(sharedCollections.map(c => c.id))
  const pieces = allPieces.filter(piece => {
    const colIds = pieceCollectionMap[piece.id] ?? []
    return colIds.some(cid => sharedCollectionIds.has(cid))
  })

  // Filter by selected collection
  const collectionFiltered = selectedCollection
    ? pieces.filter(p => (pieceCollectionMap[p.id] ?? []).includes(selectedCollection))
    : pieces

  // Filter by search query
  const displayPieces = search.trim()
    ? collectionFiltered.filter(p => {
        const q = search.trim().toLowerCase()
        const name = p.name?.toLowerCase() ?? ''
        const metal = (metalLabels[p.metal_type] ?? p.metal_type ?? '').toLowerCase()
        const category = (CATEGORIES.find(c => c.value === p.category)?.label ?? '').toLowerCase()
        const desc = (p.description ?? '').toLowerCase()
        return name.includes(q) || metal.includes(q) || category.includes(q) || desc.includes(q)
      })
    : collectionFiltered

  // Piece detail view
  if (viewingPiece) {
    const prefs = getDisplayPrefs(viewingPiece.id)
    const melt = calculateMeltValue(viewingPiece.metal_type, viewingPiece.metal_weight_grams, viewingPiece.metal_karat, prices)
    const gemVal = calculateGemstoneValue(viewingPiece.gemstones)
    const totalPieceValue = (melt ?? 0) + gemVal
    const categoryLabel = CATEGORIES.find(c => c.value === viewingPiece.category)?.label
    const profilePhoto = viewingPiece.photo_urls?.[viewingPiece.profile_photo_index ?? 0] ?? viewingPiece.photo_urls?.[0]

    return (
      <div className="space-y-4">
        <button onClick={() => setViewingPiece(null)} className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300">
          <ArrowLeft className="w-4 h-4" /> Back to {profile.display_name ?? 'collection'}
        </button>

        {/* Main photo */}
        {profilePhoto ? (
          <div
            className="aspect-video overflow-hidden bg-neutral-800 rounded-xl cursor-pointer"
            onClick={() => viewingPiece.photo_urls?.length && setLightbox({ photos: viewingPiece.photo_urls, index: viewingPiece.profile_photo_index ?? 0 })}
          >
            <CroppedImage src={profilePhoto} alt={viewingPiece.name} crop={viewingPiece.profile_photo_crop} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-32 bg-neutral-800 rounded-xl flex items-center justify-center">
            <Gem className="w-12 h-12 text-neutral-700" />
          </div>
        )}

        {/* Photo thumbnails */}
        {viewingPiece.photo_urls?.length > 1 && (
          <div className="flex gap-2 overflow-x-auto">
            {viewingPiece.photo_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-14 h-14 rounded-lg object-cover border-2 border-neutral-700 shrink-0 cursor-pointer hover:border-gold-400 transition"
                onClick={() => setLightbox({ photos: viewingPiece.photo_urls, index: i })}
              />
            ))}
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-white">{viewingPiece.name}</h2>
          {viewingPiece.description && <p className="text-sm text-neutral-400">{viewingPiece.description}</p>}

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {prefs.category && categoryLabel && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-800 text-neutral-300">{categoryLabel}</span>
            )}
            {prefs.metal && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${metalBadgeClasses(viewingPiece.metal_type)}`}>
                {metalLabels[viewingPiece.metal_type] ?? viewingPiece.metal_type}
                {isGoldType(viewingPiece.metal_type) && viewingPiece.metal_karat ? ` ${viewingPiece.metal_karat}K` : ''}
              </span>
            )}
            {prefs.weight && viewingPiece.metal_weight_grams && (
              <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-neutral-800 text-neutral-300">
                <Weight className="w-3.5 h-3.5" /> {viewingPiece.metal_weight_grams}g
              </span>
            )}
          </div>

          {/* Value */}
          {prefs.value && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <span className="text-xs text-neutral-500">Melt Value</span>
              <div className="text-lg font-bold text-gold-400">{fmtCurrency(totalPieceValue > 0 ? totalPieceValue : null)}</div>
            </div>
          )}

          {/* Gemstones */}
          {prefs.gemstones && viewingPiece.gemstones?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gold-400 mb-2">
                <Sparkles className="w-4 h-4" /> Gemstones
              </div>
              <div className="space-y-1.5">
                {viewingPiece.gemstones.map((gem, i) => (
                  <div key={i} className="bg-neutral-800 rounded-lg p-2.5 text-sm text-neutral-300">
                    <span className="font-medium text-white">
                      {gem.is_pave && gem.quantity ? `${gem.quantity}× ` : ''}
                      {gem.stone_type}
                      {gem.carat_weight ? ` — ${gem.carat_weight}ct${gem.is_pave ? 'w' : ''}` : ''}
                    </span>
                    {gem.origin && (
                      <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${gem.origin === 'lab' ? 'bg-blue-900/30 text-blue-400' : 'bg-emerald-900/30 text-emerald-400'}`}>
                        {gem.origin === 'lab' ? 'Lab' : 'Natural'}
                      </span>
                    )}
                    {prefs.value && gem.value != null && (
                      <span className="text-xs text-gold-400 ml-2">{fmtCurrency(gem.value)}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {lightbox && (
          <Lightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </div>
    )
  }

  // Main friend profile view (inline, not modal)
  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-gold-400 hover:text-gold-300">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Profile header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700 shrink-0">
          {profile.avatar_url ? (
            <CroppedImage src={profile.avatar_url} alt="" crop={profile.avatar_crop} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gold-400">
              {(profile.display_name ?? '?')[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">{profile.display_name ?? 'Unknown'}</h2>
          <p className="text-xs text-neutral-500">
            {sharedCollections.length} collection{sharedCollections.length !== 1 ? 's' : ''} shared with you
          </p>
        </div>
      </div>

      {/* Collection filter pills */}
      {!loading && sharedCollections.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
          {sharedCollections.length > 1 && (
            <button
              onClick={() => setSelectedCollection(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                !selectedCollection ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              All
            </button>
          )}
          {sharedCollections.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCollection(c.id === selectedCollection ? null : c.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                selectedCollection === c.id ? 'bg-neutral-700 text-white' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Search bar */}
      {!loading && pieces.length > 0 && (
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search pieces..."
            className="w-full pl-10 pr-4 py-2.5 bg-neutral-900 border border-neutral-800 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-sm text-white placeholder-neutral-500"
          />
        </div>
      )}

      {/* Pieces grid */}
      {loading ? (
        <div className="text-center py-12 text-neutral-500 text-sm">Loading collection...</div>
      ) : displayPieces.length === 0 ? (
        <div className="text-center py-8">
          {pieces.length === 0 ? (
            <>
              <FolderOpen className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No collections have been shared with you yet.</p>
            </>
          ) : search.trim() ? (
            <p className="text-sm text-neutral-500">No pieces match your search.</p>
          ) : (
            <>
              <Gem className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No pieces in this collection.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayPieces.map(piece => {
            const prefs = getDisplayPrefs(piece.id)
            const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]
            const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
            const gemVal = calculateGemstoneValue(piece.gemstones)
            const value = (melt ?? 0) + gemVal
            const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label

            return (
              <button
                key={piece.id}
                onClick={() => setViewingPiece(piece)}
                className="bg-neutral-900 rounded-xl border border-neutral-800 overflow-hidden hover:border-gold-400/40 transition text-left"
              >
                <div className="aspect-square bg-neutral-800 overflow-hidden">
                  {photoUrl ? (
                    <CroppedImage src={photoUrl} alt={piece.name} crop={piece.profile_photo_crop} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gem className="w-8 h-8 text-neutral-700" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-sm font-medium text-white truncate">{piece.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {prefs.category && categoryLabel && (
                      <span className="text-xs text-neutral-500">{categoryLabel}</span>
                    )}
                    {prefs.metal && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${metalBadgeClasses(piece.metal_type)}`}>
                        {metalLabels[piece.metal_type] ?? piece.metal_type}
                      </span>
                    )}
                  </div>
                  {prefs.value && value > 0 && (
                    <p className="text-xs font-medium text-gold-400 mt-1">{fmtCurrency(value)}</p>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Remove friend */}
      <div className="pt-4 border-t border-neutral-800">
        <button
          onClick={() => { if (window.confirm('Remove friend?')) onRemove() }}
          className="py-2 px-4 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/20 transition"
        >
          Remove Friend
        </button>
      </div>
    </div>
  )
}
