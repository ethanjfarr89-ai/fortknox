import { useCallback, useEffect, useState } from 'react'
import { fetchSpotPrices } from './prices'
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
      // Clear cache to force fresh fetch
      localStorage.removeItem('fortknox_spot_prices')
      const data = await fetchSpotPrices()
      setPrices(data)
    } catch (err) {
      setError('Failed to fetch spot prices')
      console.error(err)
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
      } finally {
        setLoading(false)
      }
    }
    load()

    // Auto-refresh every 5 minutes
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  return { prices, loading, error, refresh }
}
