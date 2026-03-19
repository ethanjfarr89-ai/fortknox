import { RefreshCw } from 'lucide-react'
import type { SpotPrices } from '../types'

interface Props {
  prices: SpotPrices
  loading: boolean
  onRefresh: () => void
}

function fmt(val: number | null) {
  if (val == null) return '—'
  return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export default function SpotPriceBar({ prices, loading, onRefresh }: Props) {
  return (
    <div className="bg-neutral-900 border-b border-neutral-800">
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center gap-4 overflow-x-auto scrollbar-hide text-sm">
        <span className="font-medium text-neutral-400 shrink-0">Spot Prices</span>
        <span className="text-gold-400 shrink-0">Gold {fmt(prices.gold)}/oz</span>
        <span className="text-neutral-400 shrink-0">Silver {fmt(prices.silver)}/oz</span>
        <span className="text-neutral-400 shrink-0">Platinum {fmt(prices.platinum)}/oz</span>
        <span className="text-neutral-400 shrink-0">Palladium {fmt(prices.palladium)}/oz</span>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="ml-auto shrink-0 p-1 hover:bg-neutral-800 rounded transition text-neutral-400 hover:text-gold-400"
          title="Refresh prices"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  )
}
