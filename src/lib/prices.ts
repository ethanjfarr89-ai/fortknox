import type { SpotPrices, Gemstone } from '../types'

const CACHE_KEY = 'fortknox_spot_prices'
const FALLBACK_KEY = 'fortknox_spot_prices_fallback'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Emergency fallback prices (updated periodically — better than showing $0)
const EMERGENCY_PRICES: SpotPrices = {
  gold: 2900,
  silver: 33,
  platinum: 1000,
  palladium: 950,
  updated_at: null,
}

interface CachedPrices {
  prices: SpotPrices
  cachedAt: number
}

/** Returns true if prices object has at least one real metal price */
function hasValidPrices(prices: SpotPrices): boolean {
  return prices.gold != null || prices.silver != null ||
         prices.platinum != null || prices.palladium != null
}

/** Get fresh cached prices (within TTL) */
function getFreshCache(): SpotPrices | null {
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

/** Get last known good prices (never expires) */
function getFallbackCache(): SpotPrices | null {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY)
    if (!raw) return null
    const cached: CachedPrices = JSON.parse(raw)
    return { ...cached.prices, updated_at: new Date(cached.prices.updated_at!) }
  } catch {
    // ignore
  }
  return null
}

/** Save to both fresh cache and permanent fallback */
function saveToCache(prices: SpotPrices) {
  const entry = JSON.stringify({ prices, cachedAt: Date.now() })
  localStorage.setItem(CACHE_KEY, entry)
  localStorage.setItem(FALLBACK_KEY, entry)
}

/** Get the best available prices — never returns all nulls */
function getBestAvailable(): SpotPrices {
  const fallback = getFallbackCache()
  if (fallback && hasValidPrices(fallback)) return fallback
  return { ...EMERGENCY_PRICES, updated_at: new Date() }
}

/** Merge new prices with existing, keeping old values where new ones are null */
function mergePrices(fresh: SpotPrices, existing: SpotPrices): SpotPrices {
  return {
    gold: fresh.gold ?? existing.gold,
    silver: fresh.silver ?? existing.silver,
    platinum: fresh.platinum ?? existing.platinum,
    palladium: fresh.palladium ?? existing.palladium,
    updated_at: fresh.updated_at ?? existing.updated_at,
  }
}

export async function fetchSpotPrices(): Promise<SpotPrices> {
  // 1. Return fresh cache if available
  const fresh = getFreshCache()
  if (fresh && hasValidPrices(fresh)) return fresh

  // 2. Try to fetch new prices
  const fetched = await fetchFromAPI()

  // 3. If we got valid data, save and return
  if (hasValidPrices(fetched)) {
    // Merge with fallback so partial results (e.g. gold ok but silver null) still show everything
    const existing = getBestAvailable()
    const merged = mergePrices(fetched, existing)
    saveToCache(merged)
    return merged
  }

  // 4. Fetch failed or returned all nulls — use best available fallback
  return getBestAvailable()
}

/** Clear only the fresh cache (used for manual refresh) — fallback is preserved */
export function clearFreshCache() {
  localStorage.removeItem(CACHE_KEY)
}

async function fetchFromAPI(): Promise<SpotPrices> {
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
    case 'yellow_gold':
    case 'white_gold':
    case 'rose_gold':
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

/** Sum of all gemstone values on a piece */
export function calculateGemstoneValue(gemstones: Gemstone[] | undefined | null): number {
  if (!gemstones?.length) return 0
  let total = 0
  for (const g of gemstones) {
    if (g.value != null) total += g.value
  }
  return total
}

/** True if this metal_type is a gold variant */
export function isGoldType(metalType: string): boolean {
  return metalType === 'gold' || metalType === 'yellow_gold' || metalType === 'white_gold' || metalType === 'rose_gold'
}

/** Tailwind classes for the metal type badge */
export function metalBadgeClasses(metalType: string): string {
  switch (metalType) {
    case 'rose_gold':
      return 'bg-amber-900/20 text-amber-300'
    case 'white_gold':
      return 'bg-sky-900/20 text-sky-300'
    case 'gold':
    case 'yellow_gold':
      return 'bg-gold-400/15 text-gold-400'
    case 'silver':
      return 'bg-violet-900/20 text-violet-300'
    case 'platinum':
      return 'bg-blue-900/30 text-blue-400'
    case 'palladium':
      return 'bg-teal-900/25 text-teal-300'
    default:
      return 'bg-neutral-800 text-neutral-300'
  }
}

/** Normalize legacy 'gold' to 'yellow_gold' */
export function normalizeMetalType(metalType: string): string {
  return metalType === 'gold' ? 'yellow_gold' : metalType
}
