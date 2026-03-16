import { useMemo } from 'react'
import { Gem } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { CATEGORIES } from '../types'
import { calculateMeltValue, calculateGemstoneValue } from '../lib/prices'
import CroppedImage from './CroppedImage'

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  valuationMode: ValuationMode
  privacyMode: boolean
  onViewPiece: (piece: JewelryPiece) => void
}

function getAcquiredDate(p: JewelryPiece): string | null {
  if (p.acquisition_type === 'purchased' && p.date_purchased) return p.date_purchased
  if (p.date_received) return p.date_received
  return null
}

function fmtCurrency(val: number) {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

const metalLabels: Record<string, string> = {
  gold: 'Yellow Gold', yellow_gold: 'Yellow Gold', white_gold: 'White Gold', rose_gold: 'Rose Gold',
  silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium', other: 'Other',
}

export default function PieceTimeline({ pieces, prices, valuationMode, privacyMode, onViewPiece }: Props) {
  const timeline = useMemo(() => {
    const withDates = pieces
      .map(p => ({ piece: p, date: getAcquiredDate(p) }))
      .filter((e): e is { piece: JewelryPiece; date: string } => e.date != null)
      .sort((a, b) => b.date.localeCompare(a.date))

    // Group by month
    const groups: { label: string; items: { piece: JewelryPiece; date: string }[] }[] = []
    for (const entry of withDates) {
      const d = new Date(entry.date)
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      const last = groups[groups.length - 1]
      if (last && last.label === label) {
        last.items.push(entry)
      } else {
        groups.push({ label, items: [entry] })
      }
    }
    return groups
  }, [pieces])

  const getValue = (p: JewelryPiece) => {
    if (valuationMode === 'appraised' && p.appraised_value != null) return p.appraised_value
    const melt = calculateMeltValue(p.metal_type, p.metal_weight_grams, p.metal_karat, prices) ?? 0
    const gem = calculateGemstoneValue(p.gemstones)
    return melt + gem
  }

  if (timeline.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-neutral-500">Add acquisition dates to your pieces to see the timeline.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {timeline.map(group => (
        <div key={group.label}>
          <h3 className="text-sm font-medium text-neutral-500 mb-3 sticky top-0 bg-[#0a0a0a] py-1 z-[5]">{group.label}</h3>
          <div className="relative pl-6 border-l border-neutral-800 space-y-3">
            {group.items.map(({ piece, date }) => {
              const photoUrl = piece.photo_urls?.[piece.profile_photo_index ?? 0] ?? piece.photo_urls?.[0]
              const categoryLabel = CATEGORIES.find(c => c.value === piece.category)?.label ?? piece.category
              const val = getValue(piece)

              return (
                <button
                  key={piece.id}
                  onClick={() => onViewPiece(piece)}
                  className="w-full flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-neutral-700 transition text-left relative"
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[21px] top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-gold-400 border-2 border-[#0a0a0a]" />

                  {photoUrl ? (
                    <CroppedImage
                      src={photoUrl}
                      alt=""
                      crop={piece.photo_crops?.[piece.profile_photo_index ?? 0]}
                      className="w-12 h-12 rounded-lg object-cover border border-neutral-700 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center shrink-0">
                      <Gem className="w-5 h-5 text-neutral-600" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{piece.name}</p>
                    <p className="text-xs text-neutral-500">
                      {categoryLabel} · {metalLabels[piece.metal_type] ?? piece.metal_type}
                      {piece.acquisition_type === 'purchased' ? ' · Purchased' : piece.acquisition_type === 'gift' ? ' · Gift' : piece.acquisition_type === 'inheritance' ? ' · Inherited' : ''}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs text-neutral-500">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                    {!privacyMode && val > 0 && (
                      <p className="text-sm font-medium text-white">{fmtCurrency(val)}</p>
                    )}
                    {privacyMode && <p className="text-sm text-neutral-600">•••</p>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
