// app/lib/fetchChainSummary.js

/**
 * Compute nearest weekly options expiration (Friday).
 * Uses UTC to avoid timezone drift on Vercel.
 */
function getNearestExpiryISO() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun ... 5=Fri
  const diffToFriday = (5 - day + 7) % 7 || 7;
  const expiry = new Date(now);
  expiry.setUTCDate(now.getUTCDate() + diffToFriday);
  return expiry.toISOString().slice(0, 10);
}

/**
 * Fetch front-expiry options chain summary from ChartExchange.
 * Returns the first usable row or null if no usable data exists.
 */
export async function fetchChainSummary(symbol, apiKey) {
  const expiration = getNearestExpiryISO();

  const url =
    `https://chartexchange.com/api/v1/data/options/chain-summary/` +
    `?symbol=${symbol}` +
    `&expiration=${expiration}` +
    `&format=json` +
    `&api_key=${apiKey}`;

  let r;
  try {
    r = await fetch(url, { cache: "no-store" });
  } catch (err) {
    console.log("[FETCH_CHAIN_SUMMARY] NETWORK_FAIL", symbol, expiration, err);
    return null;
  }

  if (!r.ok) {
    console.log(
      "[FETCH_CHAIN_SUMMARY] HTTP_FAIL",
      symbol,
      expiration,
      r.status
    );
    return null;
  }

  let data;
  try {
    data = await r.json();
  } catch (err) {
    console.log("[FETCH_CHAIN_SUMMARY] JSON_FAIL", symbol, expiration, err);
    return null;
  }

  console.log("[FETCH_CHAIN_SUMMARY] RAW", symbol, expiration, data);

  if (!Array.isArray(data) || data.length === 0) {
    console.log("[FETCH_CHAIN_SUMMARY] EMPTY", symbol, expiration);
    return null;
  }

  const row = data[0];

  // Accept partial rows — indexes often have incomplete fields
  if (
    row.callsTotal == null &&
    row.putsTotal == null &&
    row.maxPain == null
  ) {
    console.log(
      "[FETCH_CHAIN_SUMMARY] NO_USABLE_FIELDS",
      symbol,
      expiration,
      row
    );
    return null;
  }

  console.log("[FETCH_CHAIN_SUMMARY] LIVE", symbol, expiration, {
    callsTotal: row.callsTotal,
    putsTotal: row.putsTotal,
    maxPain: row.maxPain,
  });

  return {
    symbol,
    expiration,
    callsTotal: row.callsTotal ?? null,
    putsTotal: row.putsTotal ?? null,
    maxPain: row.maxPain ?? null,
    putCallRatio: row.putCallRatio ?? null,
  };
}
