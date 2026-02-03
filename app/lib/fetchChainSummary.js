/**
 * fetchChainSummary
 *
 * ChartExchange is inconsistent about parameter naming.
 * This function safely tries both supported formats.
 */

async function tryFetch(url, symbol) {
  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    const text = await response.text();
    console.error("[CHAIN_SUMMARY_HTTP_ERROR]", symbol, response.status, text);
    return null;
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    console.error("[CHAIN_SUMMARY_EMPTY]", symbol, data);
    return null;
  }

  return data[0];
}

export async function fetchChainSummary(symbol, apiKey) {
  if (!symbol) {
    throw new Error("fetchChainSummary: missing symbol");
  }

  if (!apiKey) {
    throw new Error("fetchChainSummary: missing CHARTEXCHANGE_API_KEY");
  }

  // Attempt 1: symbol param
  const urlSymbol =
    "https://chartexchange.com/api/v1/data/options/chain-summary/" +
    `?symbol=US:${symbol}` +
    "&format=json" +
    `&api_key=${apiKey}`;

  console.log("[CHAIN_SUMMARY_TRY_SYMBOL]", urlSymbol);

  let row = await tryFetch(urlSymbol, symbol);
  if (row) return row;

  // Attempt 2: underlying param
  const urlUnderlying =
    "https://chartexchange.com/api/v1/data/options/chain-summary/" +
    `?underlying=US:${symbol}` +
    "&format=json" +
    `&api_key=${apiKey}`;

  console.log("[CHAIN_SUMMARY_TRY_UNDERLYING]", urlUnderlying);

  row = await tryFetch(urlUnderlying, symbol);
  if (row) return row;

  // Both failed → hard error
  throw new Error(`Chain summary HTTP 400 for ${symbol}`);
}
