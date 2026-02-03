/**
 * fetchChainSummary
 *
 * Uses ChartExchange `/data/options/chain-summary`
 * This endpoint implicitly returns the FRONT / NEAREST active expiration.
 * DO NOT pass expiration. DO NOT resolve expirations separately.
 */

export async function fetchChainSummary(symbol, apiKey) {
  if (!symbol) {
    throw new Error("fetchChainSummary: missing symbol");
  }

  if (!apiKey) {
    throw new Error("fetchChainSummary: missing CHARTEXCHANGE_API_KEY");
  }

  const url =
    `https://chartexchange.com/api/v1/data/options/chain-summary/` +
    `?underlying=US:${symbol}` +
    `&format=json` +
    `&api_key=${apiKey}`;

  console.log("[CHAIN_SUMMARY_REQUEST]", { symbol, url });

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    console.error(
      "[CHAIN_SUMMARY_HTTP_ERROR]",
      symbol,
      response.status
    );
    throw new Error(`Chain summary HTTP ${response.status} for ${symbol}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.error("[CHAIN_SUMMARY_EMPTY]", symbol);
    throw new Error(`Empty chain summary for ${symbol}`);
  }

  const row = data[0];

  console.log("[CHAIN_SUMMARY_OK]", {
    symbol,
    pc_ratio: row.pc_ratio,
    calls_total: row.calls_total,
    puts_total: row.puts_total,
    max_pain: row.max_pain
  });

  return row;
}
