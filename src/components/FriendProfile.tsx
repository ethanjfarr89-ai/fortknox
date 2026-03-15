import { useEffect, useState } from 'react'
import { X, Gem, Weight, Lock, Eye, EyeOff, Sparkles } from 'lucide-react'
import type { JewelryPiece, SpotPrices, UserProfile, PrivacySettings } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue, calculateGemstoneValue, isGoldType } from '../lib/prices'
import { useScrollLock } from '../lib/useScrollLock'
import CroppedImage from './CroppedImage'
import Lightbox from './Lightbox'

interface Props {
  profile: UserProfile
  prices: SpotPrices
  fetchPieces: (userId: string) => Promise<JewelryPiece[]>
  onRemove: () => void
  onBack: () => void
  onClose: () => void
}

const metalLabels: Record<string, string> = {
  gold: 'Yellow Gold', yellow_gold: 'Yellow Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function FriendProfile({ profile, prices, fetchPieces, onRemove, onBack, onClose }: Props) {
  useScrollLock()
  const [pieces, setPieces] = useState<JewelryPiece[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingPiece, setViewingPiece] = useState<JewelryPiece | null>(null)
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const privacy: PrivacySettings = profile.privacy_settings ?? {
    show_pieces: 'friends',
    show_values: 'friends',
    show_photos: 'friends',
  }

  const canSeePieces = privacy.show_pieces !== 'private'
  const canSeeValues = privacy.show_values !== 'private'
  const canSeePhotos = privacy.show_photos !== 'private'

  useEffect(() => {
    if (!canSeePieces) { setLoading(false); return }
    const load = async () => {
      const data = await fetchPieces(profile.id)
      setPieces(data)
      setLoading(false)
    }
    load()
  }, [profile.id, canSeePieces, fetchPieces])

  // Calculate totals
  let totalValue = 0
  let pieceCount = pieces.length
  for (const piece of pieces) {
    const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
    const gemVal = calculateGemstoneValue(piece.gemstones)
    totalValue += (melt ?? 0) + gemVal
  }

  // Piece detail view
  if (viewingPiece) {
    const melt = calculateMeltValue(viewingPiece.metal_type, viewingPiece.metal_weight_grams, viewingPiece.metal_karat, prices)
    const gemVal = calculateGemstoneValue(viewingPiece.gemstones)
    const totalPieceValue = (melt ?? 0) + gemVal
    const categoryLabel = CATEGORIES.find(c => c.value === viewingPiece.category)?.label
    const profilePhoto = canSeePhotos ? (viewingPiece.photo_urls?.[viewingPiece.profile_photo_index ?? 0] ?? viewingPiece.photo_urls?.[0]) : null

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
        <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-800">
          <div className="flex items-center justify-between p-5 border-b border-neutral-800">
            <button onClick={() => setViewingPiece(null)} className="text-sm text-gold-400 hover:text-gold-300">
              &larr; Back
            </button>
            <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>

          {/* Main photo */}
          {profilePhoto ? (
            <div
              className="aspect-video overflow-hidden bg-neutral-800 cursor-pointer"
              onClick={() => canSeePhotos && viewingPiece.photo_urls?.length && setLightbox({ photos: viewingPiece.photo_urls, index: viewingPiece.profile_photo_index ?? 0 })}
            >
              <CroppedImage src={profilePhoto} alt={viewingPiece.name} crop={viewingPiece.profile_photo_crop} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="h-32 bg-neutral-800 flex items-center justify-center">
              {canSeePhotos ? (
                <Gem className="w-12 h-12 text-neutral-700" />
              ) : (
                <div className="flex items-center gap-2 text-neutral-600">
                  <EyeOff className="w-5 h-5" />
                  <span className="text-sm">Photos hidden</span>
                </div>
              )}
            </div>
          )}

          {/* Photo thumbnails */}
          {canSeePhotos && viewingPiece.photo_urls?.length > 1 && (
            <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
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

          <div className="p-5 space-y-4">
            <h2 className="text-xl font-bold text-white">{viewingPiece.name}</h2>
            {viewingPiece.description && <p className="text-sm text-neutral-400">{viewingPiece.description}</p>}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {categoryLabel && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-neutral-800 text-neutral-300">{categoryLabel}</span>
              )}
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isGoldType(viewingPiece.metal_type) ? 'bg-gold-400/15 text-gold-400' :
                viewingPiece.metal_type === 'silver' ? 'bg-neutral-800 text-neutral-300' :
                'bg-blue-900/30 text-blue-400'
              }`}>
                {metalLabels[viewingPiece.metal_type] ?? viewingPiece.metal_type}
                {isGoldType(viewingPiece.metal_type) && viewingPiece.metal_karat ? ` ${viewingPiece.metal_karat}K` : ''}
              </span>
              {viewingPiece.metal_weight_grams && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-neutral-800 text-neutral-300">
                  <Weight className="w-3.5 h-3.5" /> {viewingPiece.metal_weight_grams}g
                </span>
              )}
            </div>

            {/* Value */}
            {canSeeValues ? (
              <div className="bg-neutral-800 rounded-xl p-3">
                <span className="text-xs text-neutral-500">Melt Value</span>
                <div className="text-lg font-bold text-gold-400">{fmtCurrency(totalPieceValue > 0 ? totalPieceValue : null)}</div>
              </div>
            ) : (
              <div className="bg-neutral-800 rounded-xl p-3 flex items-center gap-2 text-neutral-500">
                <EyeOff className="w-4 h-4" />
                <span className="text-sm">Values are hidden</span>
              </div>
            )}

            {/* Gemstones */}
            {viewingPiece.gemstones?.length > 0 && (
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
                      {canSeeValues && gem.value != null && (
                        <span className="text-xs text-gold-400 ml-2">{fmtCurrency(gem.value)}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {lightbox && (
          <Lightbox photos={lightbox.photos} initialIndex={lightbox.index} onClose={() => setLightbox(null)} />
        )}
      </div>
    )
  }

  // Main friend profile view
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg border border-neutral-800">
        <div className="flex items-center justify-between p-5 border-b border-neutral-800">
          <button onClick={onBack} className="text-sm text-gold-400 hover:text-gold-300">
            &larr; Back
          </button>
          <button onClick={onClose} className="p-1 hover:bg-neutral-800 rounded-lg transition">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile header */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-neutral-800 overflow-hidden border-2 border-neutral-700">
              {profile.avatar_url ? (
                <CroppedImage src={profile.avatar_url} alt="" crop={profile.avatar_crop} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-bold text-gold-400">
                  {(profile.display_name ?? '?')[0]?.toUpperCase()}
                </div>
              )}
            </div>
            <h3 className="text-lg font-semibold text-white">{profile.display_name ?? 'Unknown'}</h3>
          </div>

          {/* Summary stats */}
          {canSeePieces && !loading && pieces.length > 0 && (
            <div className="flex gap-3">
              <div className="flex-1 bg-neutral-800 rounded-xl p-3 text-center">
                <div className="text-lg font-bold text-white">{pieceCount}</div>
                <div className="text-xs text-neutral-500">Pieces</div>
              </div>
              {canSeeValues ? (
                <div className="flex-1 bg-neutral-800 rounded-xl p-3 text-center">
                  <div className="text-lg font-bold text-gold-400">{fmtCurrency(totalValue)}</div>
                  <div className="text-xs text-neutral-500">Collection Value</div>
                </div>
              ) : (
                <div className="flex-1 bg-neutral-800 rounded-xl p-3 text-center flex flex-col items-center justify-center">
                  <EyeOff className="w-4 h-4 text-neutral-600" />
                  <div className="text-xs text-neutral-500 mt-1">Values hidden</div>
                </div>
              )}
            </div>
          )}

          {/* Privacy indicators */}
          <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              {canSeePieces ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Collection
            </span>
            <span className="flex items-center gap-1">
              {canSeeValues ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Values
            </span>
            <span className="flex items-center gap-1">
              {canSeePhotos ? <Eye className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              Photos
            </span>
          </div>

          {/* Pieces grid */}
          {!canSeePieces ? (
            <div className="text-center py-8">
              <Lock className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">This user's collection is private.</p>
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading collection...</div>
          ) : pieces.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">No pieces in their collection yet.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pieces.map(piece => {
                const photoUrl = canSeePhotos
                  ? (piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0])
                  : null
                const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
                const gemVal = calculateGemstoneValue(piece.gemstones)
                const value = (melt ?? 0) + gemVal
                const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label

                return (
                  <button
                    key={piece.id}
                    onClick={() => setViewingPiece(piece)}
                    className="bg-neutral-800 rounded-xl border border-neutral-700 overflow-hidden hover:border-gold-400/40 transition text-left"
                  >
                    <div className="aspect-square bg-neutral-800 overflow-hidden">
                      {photoUrl ? (
                        <CroppedImage src={photoUrl} alt={piece.name} crop={piece.profile_photo_crop} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {canSeePhotos ? (
                            <Gem className="w-8 h-8 text-neutral-700" />
                          ) : (
                            <EyeOff className="w-6 h-6 text-neutral-700" />
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-sm font-medium text-white truncate">{piece.name}</p>
                      {categoryLabel && (
                        <p className="text-xs text-neutral-500 mt-0.5">{categoryLabel}</p>
                      )}
                      {canSeeValues && value > 0 && (
                        <p className="text-xs font-medium text-gold-400 mt-1">{fmtCurrency(value)}</p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Remove friend */}
          <button
            onClick={() => { if (window.confirm('Remove friend?')) onRemove() }}
            className="w-full py-2.5 border border-red-900/50 text-red-400 text-sm font-medium rounded-lg hover:bg-red-900/20 transition"
          >
            Remove Friend
          </button>
        </div>
      </div>
    </div>
  )
}
