import { useEffect, useState } from 'react'

export interface HistoricalPrices {
  dates: string[]
  gold: (number | null)[]
  silver: (number | null)[]
  platinum: (number | null)[]
  palladium: (number | null)[]
}

const CACHE_KEY = 'trove_historical_prices'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 1 day

export function useHistoricalPrices() {
  const [data, setData] = useState<HistoricalPrices | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      // Check fresh cache
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw)
          if (Date.now() - cached.cachedAt < CACHE_TTL) {
            setData(cached.data)
            setLoading(false)
            return
          }
        }
      } catch {
        // ignore
      }

      // Fetch fresh data
      try {
        const res = await fetch('/api/history')
        if (res.ok) {
          const fetched = await res.json()
          if (fetched.dates?.length > 0) {
            setData(fetched)
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data: fetched, cachedAt: Date.now() }))
            setLoading(false)
            return
          }
        }
      } catch {
        // fetch failed
      }

      // Fall back to expired cache if available
      try {
        const raw = localStorage.getItem(CACHE_KEY)
        if (raw) {
          const cached = JSON.parse(raw)
          setData(cached.data)
        }
      } catch {
        // nothing we can do
      }

      setLoading(false)
    }

    load()
  }, [])

  return { historicalPrices: data, loading }
}
