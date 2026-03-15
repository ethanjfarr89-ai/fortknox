export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Cache for 24 hours — historical data doesn't change for past dates
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');

  const tickers = [
    { symbol: 'GC=F', key: 'gold' },
    { symbol: 'SI=F', key: 'silver' },
    { symbol: 'PL=F', key: 'platinum' },
    { symbol: 'PA=F', key: 'palladium' },
  ];

  const result = { dates: [], gold: [], silver: [], platinum: [], palladium: [] };

  // Fetch all metals in parallel — 5y of daily data
  const allData = {};
  await Promise.allSettled(
    tickers.map(async ({ symbol, key }) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5y`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!response.ok) return;
        const data = await response.json();
        const timestamps = data?.chart?.result?.[0]?.timestamp;
        const closes = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;
        if (timestamps && closes) {
          allData[key] = { timestamps, closes };
        }
      } catch {
        // skip this metal
      }
    })
  );

  // Use gold as primary date axis (most liquid/reliable), fallback to whatever we have
  const primary = allData.gold || Object.values(allData)[0];
  if (!primary) {
    return res.status(200).json(result);
  }

  // Convert timestamps to YYYY-MM-DD dates
  const dates = primary.timestamps.map(ts => {
    const d = new Date(ts * 1000);
    return d.toISOString().split('T')[0];
  });
  result.dates = dates;

  // For each metal, align prices to the date array with forward-fill for gaps
  for (const { key } of tickers) {
    if (allData[key]) {
      // Build date→price map
      const priceMap = {};
      for (let i = 0; i < allData[key].timestamps.length; i++) {
        const date = new Date(allData[key].timestamps[i] * 1000).toISOString().split('T')[0];
        const close = allData[key].closes[i];
        if (close != null) priceMap[date] = close;
      }
      // Map to date array, forward-filling nulls
      let lastPrice = null;
      result[key] = dates.map(date => {
        if (priceMap[date] != null) lastPrice = priceMap[date];
        return lastPrice;
      });
    } else {
      result[key] = dates.map(() => null);
    }
  }

  res.status(200).json(result);
}
