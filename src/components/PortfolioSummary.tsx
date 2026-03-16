import { TrendingUp, Eye, EyeOff } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { calculateMeltValue, calculateGemstoneValue, metalBadgeClasses } from '../lib/prices'

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  valuationMode: ValuationMode
  onToggleMode: () => void
  privacyMode: boolean
  onTogglePrivacy: () => void
}

function fmt(val: number) {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function PortfolioSummary({ pieces, prices, valuationMode, onToggleMode, privacyMode, onTogglePrivacy }: Props) {
  const goldTypes = new Set(['gold', 'yellow_gold', 'white_gold', 'rose_gold'])

  let totalValue = 0
  let piecesWithValue = 0
  let totalWeight = 0
  const weightByMetal: Record<string, number> = {}

  for (const piece of pieces) {
    if (piece.metal_weight_grams != null) {
      totalWeight += piece.metal_weight_grams
      const group = goldTypes.has(piece.metal_type) ? 'gold' : piece.metal_type
      weightByMetal[group] = (weightByMetal[group] ?? 0) + piece.metal_weight_grams
    }
  }

  const metalLabels: Record<string, string> = {
    gold: 'Gold',
    silver: 'Silver',
    platinum: 'Platinum',
    palladium: 'Palladium',
  }

  const metalOrder = ['gold', 'silver', 'platinum', 'palladium']

  for (const piece of pieces) {
    if (valuationMode === 'appraised' && piece.appraised_value != null) {
      totalValue += piece.appraised_value
      piecesWithValue++
    } else {
      const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
      const gemVal = calculateGemstoneValue(piece.gemstones)
      const pieceTotal = (melt ?? 0) + gemVal
      if (melt != null || gemVal > 0) {
        totalValue += pieceTotal
        piecesWithValue++
      }
    }
  }

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-gold-400/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-gold-400" />
            <span className="text-sm font-medium text-gold-400 uppercase tracking-wide">
              Collection Value ({valuationMode === 'melt' ? 'Melt' : 'Appraised'})
            </span>
            <button
              onClick={onTogglePrivacy}
              className="p-1 text-neutral-500 hover:text-gold-400 transition rounded"
              title={privacyMode ? 'Show values' : 'Hide values'}
            >
              {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white">
            {privacyMode ? '••••••' : fmt(totalValue)}
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            {piecesWithValue} of {pieces.length} pieces valued
          </p>
        </div>

        <button
          onClick={onToggleMode}
          className="self-start sm:self-center px-4 py-2 bg-neutral-800 border border-gold-400/30 text-gold-400 text-sm font-medium rounded-lg hover:bg-neutral-700 transition"
        >
          Switch to {valuationMode === 'melt' ? 'Appraised' : 'Melt'} Value
        </button>
      </div>

      {totalWeight > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="bg-neutral-800 rounded-lg px-3 py-2">
            <p className="text-neutral-500 text-xs">Total Weight</p>
            <p className="text-neutral-300 text-xs font-medium">
              {privacyMode ? '••••' : `${totalWeight.toFixed(1)}g`}
            </p>
          </div>
          {metalOrder
            .filter((m) => weightByMetal[m] != null)
            .map((m) => (
              <div key={m} className="bg-neutral-800 rounded-lg px-3 py-2">
                <p className={`text-xs ${metalBadgeClasses(m)}`}>{metalLabels[m]}</p>
                <p className="text-neutral-300 text-xs font-medium">
                  {privacyMode ? '••••' : `${weightByMetal[m].toFixed(1)}g`}
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
