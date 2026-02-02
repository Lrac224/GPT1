export async function POST(req) {
  const { symbols } = await req.json();

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return Response.json({ error: "no_symbols" });
  }

  const apiKey = process.env.CHARTEXCHANGE_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "missing_api_key" });
  }

  const results = [];

  for (const symbol of symbols) {
    const url =
      `https://chartexchange.com/api/v1/data/options/chain/` +
      `?symbol=${symbol}&format=json&api_key=${apiKey}`;

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      results.push({ symbol, error: "data_unavailable" });
      continue;
    }

    const data = await r.json();

    let calls = 0;
    let puts = 0;

    for (const c of data) {
      if (c.option_type === "call") calls += c.open_interest || 0;
      if (c.option_type === "put") puts += c.open_interest || 0;
    }

    if (calls === 0 || puts === 0) {
      results.push({ symbol, error: "insufficient_data" });
      continue;
    }

    const pc_ratio = +(puts / calls).toFixed(2);

    let regime = "TRANSITIONAL";
    let direction = "NEUTRAL";

    if (pc_ratio >= 2.0) {
      regime = "BEAR_CONTROLLED";
      direction = "SHORT_BIAS_INTRADAY";
    } else if (pc_ratio <= 0.7) {
      regime = "BULL_CONTROLLED";
      direction = "LONG_BIAS_INTRADAY";
    }

    results.push({
      symbol,
      calls_total: calls,
      puts_total: puts,
      pc_ratio,
      regime,
      direction
    });
  }

  return Response.json({ results });
}
