import { useMemo, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { JewelryPiece, SpotPrices, ValuationMode } from '../types'
import { calculateMeltValue } from '../lib/prices'

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
  return calculateMeltValue(piece.metal_type, piece.metal_weight_grams, piece.metal_karat, prices) ?? 0
}

export default function PortfolioChart({ pieces, prices, valuationMode }: Props) {
  const [range, setRange] = useState<string>('ALL')

  const data = useMemo(() => {
    if (pieces.length === 0) return []

    // Build timeline: for each piece, determine when it was acquired
    const events: { date: string; value: number }[] = []
    for (const piece of pieces) {
      const date = getAcquisitionDate(piece)
      if (!date) continue
      const value = getPieceValue(piece, prices, valuationMode)
      events.push({ date, value })
    }

    if (events.length === 0) return []

    // Sort by date
    events.sort((a, b) => a.date.localeCompare(b.date))

    // Build cumulative timeline
    const timeline: { date: string; value: number }[] = []
    let cumulative = 0

    // Add a zero point the day before the first acquisition
    const firstDate = new Date(events[0].date)
    firstDate.setDate(firstDate.getDate() - 1)
    timeline.push({ date: firstDate.toISOString().split('T')[0], value: 0 })

    // Group events by date and accumulate
    for (const event of events) {
      cumulative += event.value
      // If same date as last point, update it; otherwise add new point
      if (timeline.length > 0 && timeline[timeline.length - 1].date === event.date) {
        timeline[timeline.length - 1].value = cumulative
      } else {
        timeline.push({ date: event.date, value: cumulative })
      }
    }

    // Add today's point at current cumulative value
    const today = new Date().toISOString().split('T')[0]
    if (timeline[timeline.length - 1].date !== today) {
      timeline.push({ date: today, value: cumulative })
    }

    // Apply range filter
    const selectedRange = ranges.find(r => r.label === range)
    const cutoff = selectedRange && selectedRange.days > 0
      ? new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000)
      : null

    let filtered = cutoff
      ? timeline.filter(p => new Date(p.date) >= cutoff)
      : timeline

    // If range filter removed all points, find the cumulative value just before cutoff
    if (filtered.length === 0 && cutoff) {
      const beforeCutoff = timeline.filter(p => new Date(p.date) < cutoff)
      const baseValue = beforeCutoff.length > 0 ? beforeCutoff[beforeCutoff.length - 1].value : 0
      filtered = [
        { date: cutoff.toISOString().split('T')[0], value: baseValue },
        { date: today, value: cumulative },
      ]
    } else if (filtered.length === 1) {
      // Need at least 2 points - add the value just before cutoff
      if (cutoff) {
        const beforeCutoff = timeline.filter(p => new Date(p.date) < cutoff)
        const baseValue = beforeCutoff.length > 0 ? beforeCutoff[beforeCutoff.length - 1].value : 0
        filtered = [{ date: cutoff.toISOString().split('T')[0], value: baseValue }, ...filtered]
      }
    }

    return filtered.map(p => ({
      date: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: filtered.length > 365 ? '2-digit' : undefined }),
      value: Math.round(p.value * 100) / 100,
    }))
  }, [pieces, prices, valuationMode, range])

  if (pieces.length === 0) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
        <p className="text-sm text-neutral-500">Add pieces to see your portfolio chart.</p>
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
