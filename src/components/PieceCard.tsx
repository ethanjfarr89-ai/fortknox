import { useState, useRef } from 'react'
import { Gem, Pencil, Trash2, Weight, TrendingUp, TrendingDown, Gift, Crown, ChevronLeft, ChevronRight, Eye, EyeOff, Heart } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode, CardDisplayPrefs } from '../types'
import { CATEGORIES, DEFAULT_CARD_PREFS } from '../types'
import { calculateMeltValue, calculateGemstoneValue, isGoldType, metalBadgeClasses } from '../lib/prices'
import CroppedImage from './CroppedImage'

interface Props {
  piece: JewelryPiece
  prices: SpotPrices
  valuationMode: ValuationMode
  onEdit: (piece: JewelryPiece) => void
  onDelete: (id: string) => void
  privacyMode?: boolean
  onTogglePrivacy?: () => void
  cardPrefs?: CardDisplayPrefs
  onToggleFavorite?: (id: string) => void
}

function fmtCurrency(val: number | null) {
  if (val == null) return '\u2014'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const metalLabelsShort: Record<string, string> = {
  gold: 'Gold', yellow_gold: 'Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

function karatLabel(piece: JewelryPiece) {
  if (isGoldType(piece.metal_type) && piece.metal_karat) return `${piece.metal_karat}K`
  if (piece.metal_type === 'silver' && piece.metal_karat) return `${piece.metal_karat}`
  return ''
}

export default function PieceCard({ piece, prices, valuationMode, onEdit, onDelete, privacyMode, onTogglePrivacy, cardPrefs, onToggleFavorite }: Props) {
  const prefs = cardPrefs ?? DEFAULT_CARD_PREFS
  const [photoIndex, setPhotoIndex] = useState(piece.profile_photo_index ?? 0)

  const photos = piece.photo_urls ?? []
  const hasMultiplePhotos = photos.length > 1
  const currentPhoto = photos[photoIndex] ?? photos[0]
  const currentCrop = piece.photo_crops?.[String(photoIndex)]
    ?? (photoIndex === (piece.profile_photo_index ?? 0) ? piece.profile_photo_crop : null)

  const meltOnly = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
  const gemValue = calculateGemstoneValue(piece.gemstones)
  const meltValue = meltOnly != null ? meltOnly + gemValue : gemValue > 0 ? gemValue : null
  const displayValue = valuationMode === 'appraised' && piece.appraised_value != null
    ? piece.appraised_value
    : meltValue

  const roi = (displayValue != null && piece.price_paid != null && piece.price_paid > 0)
    ? ((displayValue - piece.price_paid) / piece.price_paid) * 100
    : null

  const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label

  const showRoi = prefs.roi && !privacyMode

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPhotoIndex(i => (i - 1 + photos.length) % photos.length)
  }
  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPhotoIndex(i => (i + 1) % photos.length)
  }

  // Touch swipe for mobile
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const swiped = useRef(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    swiped.current = false
  }
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart.current || !hasMultiplePhotos || swiped.current) return
    const dx = e.touches[0].clientX - touchStart.current.x
    const dy = e.touches[0].clientY - touchStart.current.y
    if (Math.abs(dx) > 30 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true
      if (dx > 0) setPhotoIndex(i => (i - 1 + photos.length) % photos.length)
      else setPhotoIndex(i => (i + 1) % photos.length)
    }
  }
  const handleTouchEnd = () => { touchStart.current = null }

  return (
    <div className={`bg-neutral-900 rounded-xl border overflow-hidden hover:border-gold-400/40 transition group flex flex-col ${
      piece.is_wishlist ? 'border-neutral-700 border-dashed' : 'border-neutral-800'
    }`}>
      {/* Photo */}
      <div
        className="aspect-square bg-neutral-800 relative overflow-hidden shrink-0"
        onTouchStart={hasMultiplePhotos ? handleTouchStart : undefined}
        onTouchMove={hasMultiplePhotos ? handleTouchMove : undefined}
        onTouchEnd={hasMultiplePhotos ? handleTouchEnd : undefined}
      >
        {currentPhoto ? (
          <CroppedImage
            src={currentPhoto}
            alt={piece.name}
            crop={currentCrop}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gem className="w-12 h-12 text-neutral-700" />
          </div>
        )}

        {hasMultiplePhotos && (
          <>
            <button
              onClick={prevPhoto}
              className="absolute left-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
            >
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={nextPhoto}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-1 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition hover:bg-black/80"
            >
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {photos.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    i === photoIndex ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          </>
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
          {piece.is_favorite && (
            <span className="p-1 bg-black/80 rounded"><Heart className="w-3 h-3 text-red-400 fill-red-400" /></span>
          )}
        </div>

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition">
          {onToggleFavorite && (
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(piece.id) }}
              className="p-1.5 bg-black/80 rounded-lg hover:bg-black shadow-sm"
            >
              <Heart className={`w-3.5 h-3.5 ${piece.is_favorite ? 'text-red-400 fill-red-400' : 'text-neutral-400'}`} />
            </button>
          )}
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

      {/* Info — flex-grow so CSS grid row height equalizes across cards */}
      <div className="p-3 flex flex-col flex-1">
        {/* Title */}
        <h3 className="font-semibold text-white text-sm truncate">{piece.name}</h3>

        {/* Details */}
        <div className="mt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {prefs.metal && (
              <span className={`shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${metalBadgeClasses(piece.metal_type)}`}>
                {metalLabelsShort[piece.metal_type] ?? piece.metal_type} {karatLabel(piece)}
              </span>
            )}
            {prefs.category && categoryLabel && (
              <span className="shrink-0 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-800 text-neutral-300">
                {categoryLabel}
              </span>
            )}
            {prefs.weight && piece.metal_weight_grams != null && (
              <span className="shrink-0 flex items-center gap-0.5 text-xs text-neutral-500">
                <Weight className="w-3 h-3" />
                {Math.round(piece.metal_weight_grams * 100) / 100}g
              </span>
            )}
            {prefs.gemstones && piece.gemstones?.length > 0 && (
              <span className="text-xs text-neutral-500 truncate">
                {piece.gemstones.map(g => g.stone_type).filter(Boolean).join(', ')}
              </span>
            )}
          </div>
        </div>

        {/* Value — guaranteed space, never crowded */}
        {prefs.value && (
          <div className="pt-2 mt-1 border-t border-neutral-800 shrink-0">
            <div className="flex items-baseline justify-between">
              <span className="text-base font-bold text-gold-400">
                {privacyMode ? '••••' : fmtCurrency(displayValue)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePrivacy?.() }}
                className="p-0.5 text-neutral-600 hover:text-gold-400 transition"
                title={privacyMode ? 'Show values' : 'Hide values'}
              >
                {privacyMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>

            {showRoi && roi !== null && (
              <div className={`flex items-center gap-1 text-xs font-medium ${roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {roi >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%{piece.price_paid != null && ` from ${fmtCurrency(piece.price_paid)}`}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
