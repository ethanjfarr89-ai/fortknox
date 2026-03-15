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
        // skip this ticker
      }
    })
  );

  res.status(200).json(prices);
}
