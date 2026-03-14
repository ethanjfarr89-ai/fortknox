import { useMemo, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { PortfolioSnapshot, ValuationMode } from '../types'

interface Props {
  snapshots: PortfolioSnapshot[]
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

export default function PortfolioChart({ snapshots, valuationMode }: Props) {
  const [range, setRange] = useState<string>('ALL')

  const data = useMemo(() => {
    if (snapshots.length < 2) return []

    const selectedRange = ranges.find(r => r.label === range)
    const cutoff = selectedRange && selectedRange.days > 0
      ? new Date(Date.now() - selectedRange.days * 24 * 60 * 60 * 1000)
      : null

    return snapshots
      .filter(s => !cutoff || new Date(s.recorded_at) >= cutoff)
      .map(s => ({
        date: new Date(s.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: valuationMode === 'melt' ? s.total_melt_value : s.total_appraised_value,
      }))
  }, [snapshots, valuationMode, range])

  if (snapshots.length < 2) {
    return (
      <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-center">
        <p className="text-sm text-neutral-500">
          Portfolio chart will appear once you have a few days of data.
          {snapshots.length === 0 ? ' Value snapshots are recorded daily.' : ' Come back tomorrow!'}
        </p>
      </div>
    )
  }

  const values = data.map(d => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const padding = (max - min) * 0.1 || 100
  const isUp = values.length >= 2 && values[values.length - 1] >= values[0]

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
      <div className="h-48">
        {data.length < 2 ? (
          <div className="flex items-center justify-center h-full text-sm text-neutral-500">
            Not enough data for this time range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <XAxis
                dataKey="date"
                tick={{ fill: '#737373', fontSize: 11 }}
                axisLine={{ stroke: '#404040' }}
                tickLine={false}
              />
              <YAxis
                domain={[Math.floor(min - padding), Math.ceil(max + padding)]}
                tick={{ fill: '#737373', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${(v / 1000).toFixed(1)}k`}
                width={55}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#171717',
                  border: '1px solid #404040',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '13px',
                }}
                formatter={(value) => [
                  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                  'Value'
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke={isUp ? '#34d399' : '#f87171'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: isUp ? '#34d399' : '#f87171' }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
