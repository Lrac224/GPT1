// app/lib/fetchOptionExpirations.js
// Fetch expiration dates by scraping ChartExchange option chain page HTML.
// This avoids relying on an expirations API endpoint that may not exist / may be tier-gated.

function monthToNumber(mon) {
  const map = {
    Jan: "01", Feb: "02", Mar: "03", Apr: "04",
    May: "05", Jun: "06", Jul: "07", Aug: "08",
    Sep: "09", Oct: "10", Nov: "11", Dec: "12"
  };
  return map[mon] || null;
}

function toYMDFromHumanDate(human) {
  // human like "Feb 20, 2026"
  const m = human.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),\s+(\d{4})\b/);
  if (!m) return null;
  const mm = monthToNumber(m[1]);
  if (!mm) return null;
  const dd = String(m[2]).padStart(2, "0");
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

function uniq(arr) {
  return [...new Set(arr)];
}

export async function fetchOptionExpirations(symbol) {
  // ChartExchange uses exchange in the URL path: /symbol/{exchange}-{symbol}/optionchain/
  // IWM is commonly ARCA, but we try a few common venues.
  const venues = ["arca", "nyse", "nasdaq", "amex", "bats", "cboe"];

  let lastErr = null;

  for (const venue of venues) {
    const url = `https://chartexchange.com/symbol/${venue}-${symbol.toLowerCase()}/optionchain/`;

    try {
      const r = await fetch(url, {
        cache: "no-store",
        headers: {
          // Helps avoid edge cases where a site blocks default fetch user-agents
          "user-agent": "Mozilla/5.0"
        }
      });

      if (!r.ok) {
        lastErr = new Error(`Optionchain HTML HTTP ${r.status} for ${symbol} (${venue})`);
        continue;
      }

      const html = await r.text();

      // Extract the "Expiration Dates" region and parse human dates
      // We don’t need perfect HTML parsing; the dates appear as plain text.
      const matches = html.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},\s+\d{4}\b/g) || [];

      const ymDates = uniq(matches.map(toYMDFromHumanDate).filter(Boolean)).sort();

      // We need at least one future-ish date; if we got none, try next venue.
      if (ymDates.length === 0) {
        lastErr = new Error(`No expirations found in optionchain HTML for ${symbol} (${venue})`);
        continue;
      }

      return ymDates;
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(lastErr?.message || `Expiration fetch failed for ${symbol}`);
}
