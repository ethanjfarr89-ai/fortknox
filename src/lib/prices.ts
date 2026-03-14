import type { SpotPrices } from '../types'

const CACHE_KEY = 'fortknox_spot_prices'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedPrices {
  prices: SpotPrices
  cachedAt: number
}

function getCached(): SpotPrices | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedPrices = JSON.parse(raw)
    if (Date.now() - cached.cachedAt < CACHE_TTL) {
      return { ...cached.prices, updated_at: new Date(cached.prices.updated_at!) }
    }
  } catch {
    // ignore
  }
  return null
}

function setCache(prices: SpotPrices) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ prices, cachedAt: Date.now() }))
}

// Fetches gold/silver/platinum/palladium spot prices from Yahoo Finance futures
// Uses the v8 chart API via a CORS proxy for browser requests
export async function fetchSpotPrices(): Promise<SpotPrices> {
  const cached = getCached()
  if (cached) return cached

  const tickers = [
    { symbol: 'GC=F', key: 'gold' as const },
    { symbol: 'SI=F', key: 'silver' as const },
    { symbol: 'PL=F', key: 'platinum' as const },
    { symbol: 'PA=F', key: 'palladium' as const },
  ]

  const prices: SpotPrices = {
    gold: null,
    silver: null,
    platinum: null,
    palladium: null,
    updated_at: null,
  }

  const results = await Promise.allSettled(
    tickers.map(async ({ symbol, key }) => {
      // Yahoo Finance v8 chart endpoint — works with CORS proxy
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch ${symbol}`)
      const data = await res.json()
      const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
      if (typeof price === 'number') {
        prices[key] = price
      }
    })
  )

  // If all failed, try the allcors proxy as fallback
  const allFailed = results.every(r => r.status === 'rejected')
  if (allFailed) {
    await Promise.allSettled(
      tickers.map(async ({ symbol, key }) => {
        const url = `https://api.allorigins.win/raw?url=${encodeURIComponent(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
        )}`
        const res = await fetch(url)
        if (!res.ok) return
        const data = await res.json()
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice
        if (typeof price === 'number') {
          prices[key] = price
        }
      })
    )
  }

  prices.updated_at = new Date()
  setCache(prices)
  return prices
}

// Grams to troy ounces conversion
const GRAMS_PER_TROY_OZ = 31.1035

// Calculate melt value of a piece based on metal type, weight, karat, and spot price
export function calculateMeltValue(
  metalType: string,
  weightGrams: number | null,
  karat: number | null,
  spotPrices: SpotPrices
): number | null {
  if (!weightGrams || weightGrams <= 0) return null

  let pricePerOz: number | null = null
  let purity = 1

  switch (metalType) {
    case 'gold':
      pricePerOz = spotPrices.gold
      // Karat purity: 24k = 100%, 18k = 75%, 14k = 58.3%, 10k = 41.7%
      purity = (karat ?? 24) / 24
      break
    case 'silver':
      pricePerOz = spotPrices.silver
      purity = (karat ?? 999) / 999 // Sterling = 925/999
      break
    case 'platinum':
      pricePerOz = spotPrices.platinum
      purity = (karat ?? 950) / 1000
      break
    case 'palladium':
      pricePerOz = spotPrices.palladium
      purity = (karat ?? 950) / 1000
      break
    default:
      return null
  }

  if (!pricePerOz) return null

  const troyOz = weightGrams / GRAMS_PER_TROY_OZ
  return troyOz * pricePerOz * purity
}
