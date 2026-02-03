export async function fetchChainSummary(symbol, expiration, apiKey) {
  const underlying = `US:${symbol}`;

  const url =
    `https://chartexchange.com/api/v1/data/options/chain-summary/` +
    `?underlying=${underlying}` +
    `&expiration=${expiration}` +
    `&format=json` +
    `&api_key=${apiKey}`;

  try {
    const r = await fetch(url, { cache: "no-store" });

    if (!r.ok) {
      console.error("[CHAIN_FETCH_FAILED]", symbol, expiration, r.status);
      return null;
    }

    const data = await r.json();
    return data?.[0] ?? null;
  } catch (err) {
    console.error("[FETCH_ERROR]", err);
    return null;
  }
}
