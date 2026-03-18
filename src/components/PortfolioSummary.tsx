import { useState, useRef, useEffect } from 'react'
import { TrendingUp, TrendingDown, Eye, EyeOff, SlidersHorizontal, Crown } from 'lucide-react'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { calculateMeltValue, calculateGemstoneValue, metalBadgeClasses, isGoldType } from '../lib/prices'

export interface SummaryDisplayPrefs {
  totalValue: boolean
  weightBreakdown: boolean
  pieceCount: boolean
  avgValue: boolean
  totalGain: boolean
  topPiece: boolean
  metalAllocation: boolean
}

export const DEFAULT_SUMMARY_PREFS: SummaryDisplayPrefs = {
  totalValue: true,
  weightBreakdown: true,
  pieceCount: true,
  avgValue: false,
  totalGain: false,
  topPiece: false,
  metalAllocation: false,
}

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  valuationMode: ValuationMode
  onToggleMode: () => void
  privacyMode: boolean
  onTogglePrivacy: () => void
  summaryPrefs: SummaryDisplayPrefs
  onUpdateSummaryPref: (key: keyof SummaryDisplayPrefs) => void
}

function fmt(val: number) {
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

export default function PortfolioSummary({ pieces, prices, valuationMode, onToggleMode, privacyMode, onTogglePrivacy, summaryPrefs, onUpdateSummaryPref }: Props) {
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false)
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showSettings])

  let totalValue = 0
  let piecesWithValue = 0
  let totalWeight = 0
  const weightByMetal: Record<string, number> = {}

  for (const piece of pieces) {
    if (piece.metal_weight_grams != null) {
      totalWeight += piece.metal_weight_grams
      const group = isGoldType(piece.metal_type) ? 'gold' : piece.metal_type
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

  const avgValue = piecesWithValue > 0 ? totalValue / piecesWithValue : 0

  // Total Gain/Loss
  let totalGain = 0
  let hasGainData = false
  for (const piece of pieces) {
    if (piece.price_paid != null && piece.price_paid > 0) {
      let pieceValue = 0
      if (valuationMode === 'appraised' && piece.appraised_value != null) {
        pieceValue = piece.appraised_value
      } else {
        const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
        const gemVal = calculateGemstoneValue(piece.gemstones)
        pieceValue = (melt ?? 0) + gemVal
      }
      if (pieceValue > 0) {
        totalGain += pieceValue - piece.price_paid
        hasGainData = true
      }
    }
  }

  // Most Valuable Piece
  let topPiece: { name: string; value: number } | null = null
  for (const piece of pieces) {
    let pieceValue = 0
    if (valuationMode === 'appraised' && piece.appraised_value != null) {
      pieceValue = piece.appraised_value
    } else {
      const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
      const gemVal = calculateGemstoneValue(piece.gemstones)
      pieceValue = (melt ?? 0) + gemVal
    }
    if (pieceValue > 0 && (topPiece == null || pieceValue > topPiece.value)) {
      topPiece = { name: piece.name, value: pieceValue }
    }
  }

  // Metal Allocation (by value)
  const valueByMetal: Record<string, number> = {}
  for (const piece of pieces) {
    let pieceValue = 0
    if (valuationMode === 'appraised' && piece.appraised_value != null) {
      pieceValue = piece.appraised_value
    } else {
      const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices)
      const gemVal = calculateGemstoneValue(piece.gemstones)
      pieceValue = (melt ?? 0) + gemVal
    }
    if (pieceValue > 0) {
      const group = isGoldType(piece.metal_type) ? 'gold' : piece.metal_type
      valueByMetal[group] = (valueByMetal[group] ?? 0) + pieceValue
    }
  }
  const totalAllocValue = Object.values(valueByMetal).reduce((a, b) => a + b, 0)

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
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1 text-neutral-500 hover:text-gold-400 transition rounded-md hover:bg-neutral-800"
                title="Summary display settings"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              {showSettings && (
                <div className="absolute right-0 mt-1 w-48 bg-neutral-900 border border-neutral-800 rounded-lg shadow-xl z-50 py-2">
                  <p className="px-3 py-1.5 text-xs font-medium text-neutral-500 uppercase tracking-wide">Show in summary</p>
                  {([
                    ['totalValue', 'Total Value'],
                    ['weightBreakdown', 'Weight Breakdown'],
                    ['pieceCount', 'Piece Count'],
                    ['avgValue', 'Avg Value/Piece'],
                    ['totalGain', 'Total Gain/Loss'],
                    ['topPiece', 'Most Valuable Piece'],
                    ['metalAllocation', 'Metal Allocation'],
                  ] as [keyof SummaryDisplayPrefs, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => onUpdateSummaryPref(key)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 transition"
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        summaryPrefs[key] ? 'bg-gold-400 border-gold-400' : 'border-neutral-600'
                      }`}>
                        {summaryPrefs[key] && <span className="text-black text-xs font-bold">✓</span>}
                      </div>
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white">
            {privacyMode ? '••••••' : fmt(totalValue)}
          </div>
          {summaryPrefs.pieceCount && (
            <p className="text-sm text-neutral-500 mt-1">
              {piecesWithValue} of {pieces.length} pieces valued
              {summaryPrefs.avgValue && piecesWithValue > 0 && (
                <span className="ml-2">
                  · Avg: {privacyMode ? '••••' : fmt(avgValue)}/piece
                </span>
              )}
            </p>
          )}
          {!summaryPrefs.pieceCount && summaryPrefs.avgValue && piecesWithValue > 0 && (
            <p className="text-sm text-neutral-500 mt-1">
              Avg: {privacyMode ? '••••' : fmt(avgValue)}/piece
            </p>
          )}
        </div>

        <button
          onClick={onToggleMode}
          className="self-start sm:self-center px-4 py-2 bg-neutral-800 border border-gold-400/30 text-gold-400 text-sm font-medium rounded-lg hover:bg-neutral-700 transition"
        >
          Switch to {valuationMode === 'melt' ? 'Appraised' : 'Melt'} Value
        </button>
      </div>

      {/* Stats row */}
      {(summaryPrefs.weightBreakdown || summaryPrefs.totalGain || summaryPrefs.topPiece) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {summaryPrefs.totalGain && hasGainData && (
            <div className="bg-neutral-800 rounded-lg px-3 py-2">
              <p className="text-neutral-500 text-xs">Total Gain/Loss</p>
              <p className={`text-xs font-medium flex items-center gap-1 ${totalGain >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {privacyMode ? '••••' : (
                  <>
                    {totalGain >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {totalGain >= 0 ? '+' : ''}{fmt(totalGain)}
                  </>
                )}
              </p>
            </div>
          )}
          {summaryPrefs.topPiece && topPiece && (
            <div className="bg-neutral-800 rounded-lg px-3 py-2">
              <p className="text-neutral-500 text-xs flex items-center gap-1">
                <Crown className="w-3 h-3 text-gold-400" /> Most Valuable
              </p>
              <p className="text-neutral-300 text-xs font-medium truncate max-w-[140px]">
                {privacyMode ? '••••' : `${topPiece.name} · ${fmt(topPiece.value)}`}
              </p>
            </div>
          )}
          {summaryPrefs.weightBreakdown && totalWeight > 0 && (
            <>
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
            </>
          )}
        </div>
      )}

      {/* Metal Allocation bar */}
      {summaryPrefs.metalAllocation && totalAllocValue > 0 && (
        <div className="mt-4">
          <p className="text-neutral-500 text-xs mb-2">Metal Allocation by Value</p>
          <div className="h-3 rounded-full overflow-hidden flex">
            {metalOrder
              .filter((m) => valueByMetal[m] != null)
              .map((m) => {
                const pct = (valueByMetal[m] / totalAllocValue) * 100
                const colors: Record<string, string> = {
                  gold: 'bg-yellow-500',
                  silver: 'bg-neutral-400',
                  platinum: 'bg-blue-400',
                  palladium: 'bg-teal-400',
                }
                return (
                  <div
                    key={m}
                    className={`${colors[m] ?? 'bg-neutral-600'} transition-all`}
                    style={{ width: `${pct}%` }}
                    title={`${metalLabels[m]}: ${pct.toFixed(1)}%`}
                  />
                )
              })}
            {valueByMetal['other'] != null && (
              <div
                className="bg-neutral-600 transition-all"
                style={{ width: `${(valueByMetal['other'] / totalAllocValue) * 100}%` }}
                title={`Other: ${((valueByMetal['other'] / totalAllocValue) * 100).toFixed(1)}%`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-1.5">
            {metalOrder
              .filter((m) => valueByMetal[m] != null)
              .map((m) => {
                const pct = (valueByMetal[m] / totalAllocValue) * 100
                return (
                  <span key={m} className="text-xs text-neutral-400">
                    <span className={metalBadgeClasses(m)}>{metalLabels[m]}</span>{' '}
                    {privacyMode ? '••%' : `${pct.toFixed(0)}%`}
                  </span>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
