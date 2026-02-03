export async function fetchChainSummary(symbol, apiKey) {
  const url =
    `https://chartexchange.com/api/v1/data/options/chain-summary/` +
    `?symbol=${symbol}&format=json&api_key=${apiKey}`;

  const r = await fetch(url, { cache: "no-store" });

  if (!r.ok) return null;

  const data = await r.json();
  return data?.[0] ?? null;
  console.log("[FETCH_CHAIN_SUMMARY] LIVE", symbol);
}
