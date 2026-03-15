import { Gem, Pencil, Trash2, Weight, TrendingUp, TrendingDown, Gift, Crown } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue } from '../lib/prices'
import CroppedImage from './CroppedImage'

interface Props {
  piece: JewelryPiece
  prices: SpotPrices
  valuationMode: ValuationMode
  onEdit: (piece: JewelryPiece) => void
  onDelete: (id: string) => void
}

function fmtCurrency(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

const metalLabels: Record<string, string> = {
  gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function karatLabel(piece: JewelryPiece) {
  if (piece.metal_type === 'gold' && piece.metal_karat) return `${piece.metal_karat}K`
  if (piece.metal_type === 'silver' && piece.metal_karat) return `${piece.metal_karat}`
  return ''
}

export default function PieceCard({ piece, prices, valuationMode, onEdit, onDelete }: Props) {
  const meltValue = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
  const displayValue = valuationMode === 'appraised' && piece.appraised_value != null
    ? piece.appraised_value
    : meltValue

  // ROI calculation
  const roi = (displayValue != null && piece.price_paid != null && piece.price_paid > 0)
    ? ((displayValue - piece.price_paid) / piece.price_paid) * 100
    : null

  // Profile photo
  const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]
  const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label

  return (
    <div className={`bg-neutral-900 rounded-xl border overflow-hidden hover:border-gold-400/40 transition group ${
      piece.is_wishlist ? 'border-neutral-700 border-dashed' : 'border-neutral-800'
    }`}>
      {/* Photo */}
      <div className="aspect-square bg-neutral-800 relative overflow-hidden">
        {photoUrl ? (
          <CroppedImage
            src={photoUrl}
            alt={piece.name}
            crop={piece.profile_photo_crop}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gem className="w-12 h-12 text-neutral-700" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1">
          {piece.is_wishlist && (
            <span className="px-2 py-0.5 bg-black/80 rounded text-xs text-gold-400 font-medium">Wishlist</span>
          )}
          {piece.acquisition_type === 'gift' && (
            <span className="p-1 bg-black/80 rounded"><Gift className="w-3 h-3 text-pink-400" /></span>
          )}
          {piece.acquisition_type === 'inheritance' && (
            <span className="p-1 bg-black/80 rounded"><Crown className="w-3 h-3 text-purple-400" /></span>
          )}
        </div>

        {/* Actions overlay */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(piece) }}
            className="p-1.5 bg-black/80 rounded-lg hover:bg-black shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5 text-gold-400" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(piece.id) }}
            className="p-1.5 bg-black/80 rounded-lg hover:bg-red-950 shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-white truncate">{piece.name}</h3>

        <div className="flex items-center gap-2 mt-1.5 text-sm text-neutral-400 flex-wrap">
          {categoryLabel && (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
              {categoryLabel}
            </span>
          )}
          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
            piece.metal_type === 'gold' ? 'bg-gold-400/15 text-gold-400' :
            piece.metal_type === 'silver' ? 'bg-neutral-800 text-neutral-300' :
            'bg-blue-900/30 text-blue-400'
          }`}>
            {metalLabels[piece.metal_type] ?? piece.metal_type} {karatLabel(piece)}
          </span>
          {piece.metal_weight_grams && (
            <span className="flex items-center gap-0.5">
              <Weight className="w-3 h-3" />
              {piece.metal_weight_grams}g
            </span>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-neutral-800">
          <div className="flex items-baseline justify-between">
            <span className="text-lg font-bold text-gold-400">{fmtCurrency(displayValue)}</span>
            <span className="text-xs text-neutral-600">
              {valuationMode === 'appraised' && piece.appraised_value != null ? 'appraised' : 'melt'}
            </span>
          </div>

          {/* ROI */}
          {roi !== null && (
            <div className={`flex items-center gap-1 mt-1 text-xs font-medium ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {roi >= 0 ? '+' : ''}{roi.toFixed(1)}% from {fmtCurrency(piece.price_paid)}
            </div>
          )}
        </div>

        {piece.gemstones?.length > 0 && (
          <p className="text-xs text-neutral-500 mt-2 truncate">
            {piece.gemstones.map(g => g.stone_type).filter(Boolean).join(', ')}
          </p>
        )}
      </div>
    </div>
  )
}
