import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { calculateMeltValue, calculateGemstoneValue } from '../lib/prices'
import { useHistoricalPrices } from '../lib/useHistoricalPrices'

interface Props {
  pieces: JewelryPiece[]
  prices: SpotPrices
  valuationMode: ValuationMode
}

const ranges = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
  { label: '1Y', days: 365 },
  { label: '2Y', days: 730 },
  { label: '5Y', days: 1825 },
  { label: 'ALL', days: 0 },
] as const

function getAcquisitionDate(piece: JewelryPiece): string | null {
  if (piece.acquisition_type === 'purchased' && piece.date_purchased) return piece.date_purchased
  if (piece.date_received) return piece.date_received
  return piece.created_at?.split('T')[0] ?? null
}

function getPieceValue(piece: JewelryPiece, prices: SpotPrices, mode: ValuationMode): number {
  if (mode === 'appraised' && piece.appraised_value != null) return piece.appraised_value
  const melt = calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices) ?? 0
  return melt + calculateGemstoneValue(piece.gemstones)
}

export default function PortfolioChart({ pieces, prices, valuationMode }: Props) {
  const [range, setRange] = useState<string>('ALL')
  const { historicalPrices, loading: histLoading } = useHistoricalPrices()

  const data = useMemo(() => {
    if (pieces.length === 0) return []

    // Pieces with their acquisition dates
    const piecesWithDates = pieces
      .map(p => ({ piece: p, acquiredDate: getAcquisitionDate(p) }))
      .filter(p => p.acquiredDate != null) as { piece: JewelryPiece; acquiredDate: string }[]

    if (piecesWithDates.length === 0) return []

    // Determine range filter
    const selectedRange = ranges.find(r => r.label === range)
    const cutoffDate = selectedRange && selectedRange.days > 0
      ? new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : null

    const today = new Date().toISOString().split('T')[0]

    // If we have historical prices, use them for true daily valuation
    if (historicalPrices && historicalPrices.dates.length > 0) {
      // Build date→prices lookup
      const dateIndex = new Map<string, number>()
      for (let i = 0; i < historicalPrices.dates.length; i++) {
        dateIndex.set(historicalPrices.dates[i], i)
      }

      // Filter dates by range
      const dates = historicalPrices.dates.filter(d => {
        if (cutoffDate && d < cutoffDate) return false
        return true
      })

      // Downsample for longer ranges to keep chart snappy
      let step = 1
      if (dates.length > 500) step = Math.ceil(dates.length / 500)

      const timeline: { date: string; value: number }[] = []

      for (let di = 0; di < dates.length; di += step) {
        const date = dates[di]
        const idx = dateIndex.get(date)
        if (idx == null) continue

        // Build that day's spot prices
        const dayPrices: SpotPrices = {
          gold: historicalPrices.gold[idx],
          silver: historicalPrices.silver[idx],
          platinum: historicalPrices.platinum[idx],
          palladium: historicalPrices.palladium[idx],
          updated_at: null,
        }

        // Sum value of all pieces owned on this date
        let totalValue = 0
        let hasAnyPiece = false
        for (const { piece, acquiredDate } of piecesWithDates) {
          if (acquiredDate <= date) {
            hasAnyPiece = true
            totalValue += getPieceValue(piece, dayPrices, valuationMode)
          }
        }

        if (hasAnyPiece) {
          timeline.push({ date, value: totalValue })
        }
      }

      // Always include today with current live prices
      const lastDate = timeline.length > 0 ? timeline[timeline.length - 1].date : null
      if (lastDate !== today) {
        let todayValue = 0
        for (const { piece, acquiredDate } of piecesWithDates) {
          if (acquiredDate <= today) {
            todayValue += getPieceValue(piece, prices, valuationMode)
          }
        }
        if (todayValue > 0) {
          timeline.push({ date: today, value: todayValue })
        }
      }

      if (timeline.length < 2) return []

      return timeline.map(p => ({
        date: formatDate(p.date, timeline.length),
        value: Math.round(p.value * 100) / 100,
      }))
    }

    // Fallback: no historical data — use current prices (old behavior)
    return buildFallbackTimeline(piecesWithDates, prices, valuationMode, cutoffDate, today)
  }, [pieces, prices, valuationMode, range, historicalPrices])

  if (pieces.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
        <p className="text-sm text-neutral-500">Add pieces to see your portfolio chart.</p>
      </div>
    )
  }

  if (histLoading) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
        <p className="text-sm text-neutral-500">Loading historical prices...</p>
      </div>
    )
  }

  if (data.length < 2) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
        <p className="text-sm text-neutral-500">Add acquisition dates to your pieces to see the portfolio chart.</p>
      </div>
    )
  }

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 100
  const isUp = values.length >= 2 && values[values.length - 1] >= values[0]
  const color = isUp ? '#34d399' : '#f87171'

  return (
    <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-medium text-neutral-400">
          Portfolio Value ({valuationMode === 'melt' ? 'Melt' : 'Appraised'})
        </h3>
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-0.5">
          {ranges.map(r => (
            <button
              key={r.label}
              onClick={() => setRange(r.label)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                range === r.label ? 'bg-gold-400 text-black' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-52">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full text-sm text-neutral-500">
            Not enough data for this time range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fill: '#525252', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={40}
              />
              <YAxis
                domain={[Math.floor(min - padding), Math.ceil(max + padding)]}
                tick={{ fill: '#525252', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #333',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                }}
                formatter={(value) => [
                  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  'Value'
                ]}
                cursor={{ stroke: '#525252', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2}
                fill="url(#chartGradient)"
                dot={false}
                activeDot={{ r: 5, fill: color, stroke: '#171717', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

/** Format date label for chart axis */
function formatDate(dateStr: string, totalPoints: number): string {
  const d = new Date(dateStr)
  if (totalPoints > 365) {
    return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Fallback timeline using current prices (when historical data unavailable) */
function buildFallbackTimeline(
  piecesWithDates: { piece: JewelryPiece; acquiredDate: string }[],
  prices: SpotPrices,
  valuationMode: ValuationMode,
  cutoffDate: string | null,
  today: string,
) {
  const events: { date: string; value: number }[] = []
  for (const { piece, acquiredDate } of piecesWithDates) {
    events.push({ date: acquiredDate, value: getPieceValue(piece, prices, valuationMode) })
  }
  events.sort((a, b) => a.date.localeCompare(b.date))

  const timeline: { date: string; value: number }[] = []
  let cumulative = 0

  const firstDate = new Date(events[0].date)
  firstDate.setDate(firstDate.getDate() - 1)
  timeline.push({ date: firstDate.toISOString().split('T')[0], value: 0 })

  for (const event of events) {
    cumulative += event.value
    if (timeline.length > 0 && timeline[timeline.length - 1].date === event.date) {
      timeline[timeline.length - 1].value = cumulative
    } else {
      timeline.push({ date: event.date, value: cumulative })
    }
  }

  if (timeline[timeline.length - 1].date !== today) {
    timeline.push({ date: today, value: cumulative })
  }

  let filtered = cutoffDate
    ? timeline.filter(p => p.date >= cutoffDate)
    : timeline

  if (filtered.length === 0 && cutoffDate) {
    const beforeCutoff = timeline.filter(p => p.date < cutoffDate)
    const baseValue = beforeCutoff.length > 0 ? beforeCutoff[beforeCutoff.length - 1].value : 0
    filtered = [
      { date: cutoffDate, value: baseValue },
      { date: today, value: cumulative },
    ]
  } else if (filtered.length === 1 && cutoffDate) {
    const beforeCutoff = timeline.filter(p => p.date < cutoffDate)
    const baseValue = beforeCutoff.length > 0 ? beforeCutoff[beforeCutoff.length - 1].value : 0
    filtered = [{ date: cutoffDate, value: baseValue }, ...filtered]
  }

  return filtered.map(p => ({
    date: formatDate(p.date, filtered.length),
    value: Math.round(p.value * 100) / 100,
  }))
}
