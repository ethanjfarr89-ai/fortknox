import { useCallback, useEffect, useState } from 'react'
import { fetchSpotPrices, clearFreshCache } from './prices'
import type { SpotPrices } from '../types'

export function useSpotPrices() {
  const [prices, setPrices] = useState<SpotPrices>({
    gold: null,
    silver: null,
    platinum: null,
    palladium: null,
    updated_at: null,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Clear fresh cache to force re-fetch, but fallback is preserved
      clearFreshCache()
      const data = await fetchSpotPrices()
      setPrices(data)
    } catch (err) {
      setError('Failed to fetch spot prices')
      console.error(err)
      // Don't clear prices on error — keep whatever we had
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await fetchSpotPrices()
        setPrices(data)
      } catch (err) {
        setError('Failed to fetch spot prices')
        console.error(err)
        // Keep existing prices on error
      } finally {
        setLoading(false)
      }
    }
    load()

    // Auto-refresh every hour
    const interval = setInterval(load, 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { prices, loading, error, refresh }
}
