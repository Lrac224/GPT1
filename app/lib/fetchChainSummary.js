export async function fetchChainSummary({
  symbol,
  expiration,
  apiKey
}) {
  if (!symbol || !expiration) {
    throw new Error("symbol and expiration are required");
  }

  const url =
    `https://chartexchange.com/api/v1/data/options/chain-summary/` +
    `?underlying=US:${symbol}` +
    `&expiration=${expiration}` +
    `&format=json` +
    `&api_key=${apiKey}`;

  const r = await fetch(url, { cache: "no-store" });

  if (!r.ok) {
    console.error("[CHAIN_SUMMARY_ERROR]", symbol, expiration);
    return null;
  }

  const data = await r.json();

  console.log("[CHAIN_SUMMARY_LIVE]", symbol, expiration);

  return data?.[0] ?? null;
}
