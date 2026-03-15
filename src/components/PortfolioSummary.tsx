import { TrendingUp } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { calculateMeltValue, calculateGemstoneValue } from '../lib/prices'

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  valuationMode: ValuationMode
  onToggleMode: () => void
}

function fmt(val: number) {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function PortfolioSummary({ pieces, prices, valuationMode, onToggleMode }: Props) {
  let totalValue = 0
  let piecesWithValue = 0

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
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white">{fmt(totalValue)}</div>
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
    </div>
  )
}
