export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=1800');

  const tickers = [
    { symbol: 'GC=F', key: 'gold' },
    { symbol: 'SI=F', key: 'silver' },
    { symbol: 'PL=F', key: 'platinum' },
    { symbol: 'PA=F', key: 'palladium' },
  ];

  const prices = { gold: null, silver: null, platinum: null, palladium: null };

  // Try primary endpoint (v8 chart API)
  await Promise.allSettled(
    tickers.map(async ({ symbol, key }) => {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!response.ok) return;
        const data = await response.json();
        const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
        if (typeof price === 'number') {
          prices[key] = price;
        }
      } catch {
        // skip this ticker on primary
      }
    })
  );

  // If primary missed any, try backup endpoint (v6 quote API)
  const missing = tickers.filter(({ key }) => prices[key] == null);
  if (missing.length > 0) {
    try {
      const symbols = missing.map(t => t.symbol).join(',');
      const url = `https://query2.finance.yahoo.com/v6/finance/quote?symbols=${symbols}`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (response.ok) {
        const data = await response.json();
        const results = data?.quoteResponse?.result ?? [];
        for (const result of results) {
          const ticker = missing.find(t => t.symbol === result.symbol);
          if (ticker && typeof result.regularMarketPrice === 'number') {
            prices[ticker.key] = result.regularMarketPrice;
          }
        }
      }
    } catch {
      // backup also failed — client-side fallback will handle it
    }
  }

  res.status(200).json(prices);
}
