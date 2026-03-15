import type { SpotPrices } from '../types'

const CACHE_KEY = 'fortknox_spot_prices'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

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

export async function fetchSpotPrices(): Promise<SpotPrices> {
  const cached = getCached()
  if (cached) return cached

  const prices: SpotPrices = {
    gold: null,
    silver: null,
    platinum: null,
    palladium: null,
    updated_at: null,
  }

  try {
    // Use our Vercel serverless function (no CORS issues)
    const res = await fetch('/api/prices')
    if (res.ok) {
      const data = await res.json()
      if (data.gold != null) prices.gold = data.gold
      if (data.silver != null) prices.silver = data.silver
      if (data.platinum != null) prices.platinum = data.platinum
      if (data.palladium != null) prices.palladium = data.palladium
    }
  } catch {
    // API route failed — try direct Yahoo as fallback (works in dev)
    const tickers = [
      { symbol: 'GC=F', key: 'gold' as const },
      { symbol: 'SI=F', key: 'silver' as const },
      { symbol: 'PL=F', key: 'platinum' as const },
      { symbol: 'PA=F', key: 'palladium' as const },
    ]

    await Promise.allSettled(
      tickers.map(async ({ symbol, key }) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
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
  if (prices.gold != null || prices.silver != null) {
    setCache(prices)
  }
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
      purity = (karat ?? 24) / 24
      break
    case 'silver':
      pricePerOz = spotPrices.silver
      purity = (karat ?? 999) / 999
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
