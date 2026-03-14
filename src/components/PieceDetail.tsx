import { useState } from 'react'
import { X, Gem, Weight, Calendar, Sparkles, TrendingUp, TrendingDown, Stamp, Shirt, Gift, Crown, FolderOpen } from 'lucide-react'
import type { JewelryPiece, SpotPrices, Collection } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue } from '../lib/prices'
import Lightbox from './Lightbox'

interface Props {
  piece: JewelryPiece
  prices: SpotPrices
  onClose: () => void
  onEdit: (piece: JewelryPiece) => void
  pieceCollections?: string[]
  collections?: Collection[]
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

const metalLabels: Record<string, string> = {
  gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function PhotoGallery({ label, icon, photos }: { label: string; icon: React.ReactNode; photos: string[] }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  if (!photos?.length) return null

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm font-medium text-gold-400 mb-2">
        {icon} {label}
      </div>
      <div className="flex gap-2 overflow-x-auto">
        {photos.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={label}
            className="w-20 h-20 rounded-lg object-cover border border-neutral-700 shrink-0 cursor-pointer hover:border-gold-400 transition"
            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i) }}
          />
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox photos={photos} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  )
}

export default function PieceDetail({ piece, prices, onClose, onEdit, pieceCollections, collections }: Props) {
  const [mainLightbox, setMainLightbox] = useState<number | null>(null)
  const meltValue = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
  const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label

  const meltRoi = (meltValue != null && piece.price_paid != null && piece.price_paid > 0)
    ? ((meltValue - piece.price_paid) / piece.price_paid) * 100 : null
  const appraisedRoi = (piece.appraised_value != null && piece.price_paid != null && piece.price_paid > 0)
    ? ((piece.appraised_value - piece.price_paid) / piece.price_paid) * 100 : null

  const profilePhoto = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]

  const dimInfo: string[] = []
  if (piece.category === 'ring' && piece.ring_size) dimInfo.push(`Size ${piece.ring_size}`)
  if (piece.category === 'chain' || piece.category === 'necklace') {
    if (piece.chain_length) dimInfo.push(`${piece.chain_length}" long`)
    if (piece.chain_width) dimInfo.push(`${piece.chain_width}mm wide`)
  }
  if (piece.category === 'bracelet') {
    if (piece.bracelet_type) dimInfo.push(piece.bracelet_type === 'bangle' ? 'Bangle' : 'Bracelet')
    if (piece.bracelet_length) dimInfo.push(`${piece.bracelet_length}" long`)
    if (piece.bracelet_width) dimInfo.push(`${piece.bracelet_width}mm wide`)
    if (piece.bracelet_type === 'bangle' && piece.bangle_size) dimInfo.push(`${piece.bangle_size}mm diameter`)
  }
  if (piece.category === 'anklet') {
    if (piece.anklet_length) dimInfo.push(`${piece.anklet_length}" long`)
    if (piece.anklet_width) dimInfo.push(`${piece.anklet_width}mm wide`)
  }
  if (piece.category === 'pendant') {
    if (piece.pendant_length) dimInfo.push(`${piece.pendant_length}mm long`)
    if (piece.pendant_width) dimInfo.push(`${piece.pendant_width}mm wide`)
  }
  if (piece.category === 'earring') {
    if (piece.earring_length) dimInfo.push(`${piece.earring_length}mm long`)
    if (piece.earring_width) dimInfo.push(`${piece.earring_width}mm wide`)
  }
  if (piece.category === 'watch') {
    if (piece.watch_maker) dimInfo.push(piece.watch_maker)
    if (piece.watch_movement) dimInfo.push(piece.watch_movement)
    if (piece.watch_dial_size) dimInfo.push(`${piece.watch_dial_size}mm dial`)
  }

  const assignedCollections = collections?.filter(c => pieceCollections?.includes(c.id)) ?? []

  function RoiBadge({ roi }: { roi: number | null }) {
    if (roi === null) return null
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
      </span>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 overflow-y-auto py-8 px-4">
      <div className="bg-neutral-900 rounded-2xl shadow-xl w-full max-w-lg relative border border-neutral-800">
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1.5 bg-black/80 rounded-lg hover:bg-black shadow-sm">
          <X className="w-5 h-5 text-neutral-400" />
        </button>

        {/* Main photo */}
        {profilePhoto ? (
          <div
            className="aspect-video overflow-hidden rounded-t-2xl bg-neutral-800 cursor-pointer"
            onClick={() => setMainLightbox(piece.profile_photo_index ?? 0)}
          >
            <img src={profilePhoto} alt={piece.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="h-40 bg-neutral-800 rounded-t-2xl flex items-center justify-center">
            <Gem className="w-16 h-16 text-neutral-700" />
          </div>
        )}

        {/* Photo thumbnails */}
        {piece.photo_urls?.length > 1 && (
          <div className="flex gap-2 px-5 pt-3 overflow-x-auto">
            {piece.photo_urls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-16 h-16 rounded-lg object-cover border-2 border-neutral-700 shrink-0 cursor-pointer hover:border-gold-400 transition"
                onClick={() => setMainLightbox(i)}
              />
            ))}
          </div>
        )}

        {mainLightbox !== null && (
          <Lightbox photos={piece.photo_urls} initialIndex={mainLightbox} onClose={() => setMainLightbox(null)} />
        )}

        <div className="p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h2 className="text-xl font-bold text-white">{piece.name}</h2>
              {piece.is_wishlist && (
                <span className="px-2 py-0.5 bg-gold-400/15 text-gold-400 text-xs font-medium rounded">Wishlist</span>
              )}
              {piece.acquisition_type === 'gift' && (
                <span className="px-2 py-0.5 bg-pink-900/30 text-pink-400 text-xs font-medium rounded inline-flex items-center gap-1"><Gift className="w-3 h-3" /> Gift</span>
              )}
              {piece.acquisition_type === 'inheritance' && (
                <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs font-medium rounded inline-flex items-center gap-1"><Crown className="w-3 h-3" /> Heirloom</span>
              )}
            </div>
            {piece.description && <p className="text-sm text-neutral-400 mt-1">{piece.description}</p>}
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {categoryLabel && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-neutral-800 text-neutral-300">{categoryLabel}</span>
            )}
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
              piece.metal_type === 'gold' ? 'bg-gold-400/15 text-gold-400' :
              piece.metal_type === 'silver' ? 'bg-neutral-800 text-neutral-300' :
              'bg-blue-900/30 text-blue-400'
            }`}>
              {metalLabels[piece.metal_type]} {piece.metal_type === 'gold' && piece.metal_karat ? `${piece.metal_karat}K` : ''}
            </span>
            {piece.metal_weight_grams && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-neutral-800 text-neutral-300">
                <Weight className="w-3.5 h-3.5" /> {piece.metal_weight_grams}g
              </span>
            )}
          </div>

          {/* Collections */}
          {assignedCollections.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <FolderOpen className="w-3.5 h-3.5 text-neutral-500" />
              {assignedCollections.map(c => (
                <span key={c.id} className="px-2 py-0.5 bg-neutral-800 text-neutral-400 text-xs rounded">{c.name}</span>
              ))}
            </div>
          )}

          {dimInfo.length > 0 && <div className="text-sm text-neutral-400">{dimInfo.join(' · ')}</div>}

          {/* Values */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-neutral-500">Melt Value</span>
                <RoiBadge roi={meltRoi} />
              </div>
              <div className="text-lg font-bold text-gold-400">{fmtCurrency(meltValue)}</div>
            </div>
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-xs text-neutral-500">Appraised</span>
                <RoiBadge roi={appraisedRoi} />
              </div>
              <div className="text-lg font-bold text-gold-400">{fmtCurrency(piece.appraised_value)}</div>
            </div>
          </div>

          {/* Acquisition info */}
          {piece.acquisition_type === 'purchased' && (piece.price_paid != null || piece.date_purchased) && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500 mb-1">Purchase Info</div>
              <div className="flex gap-4 text-sm text-neutral-300">
                {piece.price_paid != null && <span>Paid: {fmtCurrency(piece.price_paid)}</span>}
                {piece.date_purchased && <span>Date: {new Date(piece.date_purchased).toLocaleDateString()}</span>}
              </div>
            </div>
          )}
          {piece.acquisition_type === 'gift' && (piece.gifted_by || piece.date_received) && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500 mb-1">Gift Info</div>
              <div className="flex gap-4 text-sm text-neutral-300">
                {piece.gifted_by && <span>From: {piece.gifted_by}</span>}
                {piece.date_received && <span>Received: {new Date(piece.date_received).toLocaleDateString()}</span>}
              </div>
            </div>
          )}
          {piece.acquisition_type === 'inheritance' && (piece.inherited_from || piece.date_received) && (
            <div className="bg-neutral-800 rounded-xl p-3">
              <div className="text-xs text-neutral-500 mb-1">Heirloom Info</div>
              <div className="flex gap-4 text-sm text-neutral-300">
                {piece.inherited_from && <span>From: {piece.inherited_from}</span>}
                {piece.date_received && <span>Received: {new Date(piece.date_received).toLocaleDateString()}</span>}
              </div>
            </div>
          )}

          {/* Gemstones */}
          {piece.gemstones?.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gold-400 mb-2">
                <Sparkles className="w-4 h-4" /> Gemstones
              </div>
              <div className="space-y-2">
                {piece.gemstones.map((gem, i) => (
                  <div key={i} className="bg-neutral-800 rounded-lg p-3 text-sm text-neutral-300">
                    <div className="font-medium text-white">
                      {gem.stone_type}{gem.carat_weight ? ` — ${gem.carat_weight}ct` : ''}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {[gem.cut, gem.color && `Color: ${gem.color}`, gem.clarity && `Clarity: ${gem.clarity}`].filter(Boolean).join(' · ')}
                    </div>
                    {gem.gia_number && <div className="text-xs text-neutral-500 mt-0.5">GIA: {gem.gia_number}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {piece.history && (
            <div>
              <div className="flex items-center gap-1.5 text-sm font-medium text-gold-400 mb-1"><Calendar className="w-4 h-4" /> History</div>
              <p className="text-sm text-neutral-400">{piece.history}</p>
            </div>
          )}

          {piece.significance && (
            <div>
              <div className="text-sm font-medium text-gold-400 mb-1">Significance</div>
              <p className="text-sm text-neutral-400">{piece.significance}</p>
            </div>
          )}

          <PhotoGallery label="Hallmarks" icon={<Stamp className="w-4 h-4" />} photos={piece.hallmark_photo_urls ?? []} />
          <PhotoGallery label="Styling Examples" icon={<Shirt className="w-4 h-4" />} photos={piece.styling_photo_urls ?? []} />
        </div>

        <div className="p-5 border-t border-neutral-800">
          <button
            onClick={() => { onClose(); onEdit(piece) }}
            className="w-full py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition text-sm"
          >
            Edit Piece
          </button>
        </div>
      </div>
    </div>
  )
}
