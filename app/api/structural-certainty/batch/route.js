export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { symbols } = req.body;

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: "invalid_symbols" });
  }

  const apiKey = process.env.CHARTEXCHANGE_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "missing_api_key" });
  }

  try {
    const results = {};

    for (const symbol of symbols) {
      const url = `https://chartexchange.com/api/data/options/chain-summary/?symbol=${symbol}&format=json&api_key=${apiKey}`;

      const r = await fetch(url);
      if (!r.ok) throw new Error(`ChartExchange failed for ${symbol}`);

      const data = await r.json();

      results[symbol] = {
        symbol,
        totalCallOI: data.calls?.openInterest ?? null,
        totalPutOI: data.puts?.openInterest ?? null,
        callPutRatio: data.calls && data.puts
          ? data.calls.openInterest / Math.max(data.puts.openInterest, 1)
          : null,
        timestamp: new Date().toISOString()
      };
    }

    return res.status(200).json({
      source: "chartexchange:chain-summary",
      data: results
    });

  } catch (err) {
    return res.status(502).json({
      error: "data_unavailable",
      detail: err.message
    });
  }
}
