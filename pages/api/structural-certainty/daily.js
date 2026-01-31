// pages/api/structural-certainty/daily.js

async function fetchJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fetch failed: ${url}`);
  return r.json();
}

/* =========================
   DERIVATION LOGIC
========================= */

// Direction from STOCK pressure (robust, always available)
function deriveDirection({ shortVolRatio, shortInterestChange, borrowRate }) {
  if (shortVolRatio > 0.55 && shortInterestChange >= 0 && borrowRate > 3)
    return "DOWN";

  if (shortVolRatio < 0.45 && shortInterestChange < 0)
    return "UP";

  return "NEUTRAL";
}

// Regime from pressure concentration
function deriveRegime({ shortVolRatio, borrowRate }) {
  if (shortVolRatio > 0.55 && borrowRate > 3) return "BEAR_CONTROLLED";
  if (shortVolRatio < 0.45 && borrowRate < 2) return "BULL_CONTROLLED";
  return "TRANSITIONAL";
}

function deriveDirectionGate(direction) {
  if (direction === "DOWN") return "SHORT_BIAS_INTRADAY";
  if (direction === "UP") return "LONG_BIAS_INTRADAY";
  return "MEAN_REVERSION_ONLY";
}

function deriveExecutionMode({ regime, direction }) {
  if (regime === "BEAR_CONTROLLED" && direction === "DOWN")
    return "SHORT_SCALPS_FAVORED";
  if (regime === "BULL_CONTROLLED" && direction === "UP")
    return "LONG_SCALPS_FAVORED";
  return "SELECTIVE / REDUCED_SIZE";
}

function deriveAllowedTrades(direction) {
  if (direction === "DOWN") {
    return [
      "Short failed pops into VWAP / prior day high",
      "Sell call-side rips; avoid chasing breakdowns",
      "Favor downside momentum scalps after weak bounces",
      "Cover partials quickly at intraday supports"
    ];
  }

  if (direction === "UP") {
    return [
      "Buy pullbacks into VWAP / prior day low",
      "Sell put-side flushes; avoid chasing breakouts",
      "Favor upside momentum after consolidation",
      "Trim into intraday resistance"
    ];
  }

  return [
    "Mean reversion only",
    "Fade extremes into VWAP",
    "Avoid trend continuation trades"
  ];
}

/* =========================
   API HANDLER
========================= */

export default async function handler(req, res) {
  try {
    const symbol = (req.query.symbol || "").toUpperCase();
    if (!symbol) {
      return res.status(400).json({ error: "Missing symbol" });
    }

    // INTERNAL API BASE (SAFE ON VERCEL)
    const base = `https://${req.headers.host}/api/cex`;

    // Pull ONLY reliable endpoints
    const [
      shortVol,
      shortInterest,
      borrow
    ] = await Promise.all([
      fetchJSON(`${base}/short-volume?symbol=${symbol}`),
      fetchJSON(`${base}/short-interest-daily?symbol=${symbol}`),
      fetchJSON(`${base}/borrow-fee?symbol=${symbol}`)
    ]);

    // Normalize inputs (defensive defaults)
    const shortVolRatio =
      shortVol?.short_volume_ratio ??
      shortVol?.shortVolumeRatio ??
      0.5;

    const shortInterestChange =
      shortInterest?.change ??
      shortInterest?.change_pct ??
      0;

    const borrowRate =
      borrow?.rate ??
      borrow?.borrow_rate ??
      0;

    // Structural derivations
    const direction = deriveDirection({
      shortVolRatio,
      shortInterestChange,
      borrowRate
    });

    const regime = deriveRegime({
      shortVolRatio,
      borrowRate
    });

    const directionGate = deriveDirectionGate(direction);
    const executionMode = deriveExecutionMode({ regime, direction });
    const allowedTrades = deriveAllowedTrades(direction);

    // Final response (matches your daily format)
    return res.status(200).json({
      symbol,
      date: new Date().toISOString().slice(0, 10),
      marketStatus: "closed",

      A_regime: {
        regime,
        direction,
        shortVolRatio,
        shortInterestChange,
        borrowRate
      },

      B_direction_gate: directionGate,

      C_execution_mode: executionMode,

      D_allowed_trades: allowedTrades,

      summary: {
        structural_direction: direction,
        primary_risk:
          direction === "DOWN"
            ? "Sharp bear-market rallies squeezing shorts"
            : direction === "UP"
            ? "Fast downside reversals after long positioning"
            : "False breakouts in low-certainty regime"
      }
    });
  } catch (err) {
    return res.status(500).json({
      error: "Structural Certainty failed",
      detail: err.message
    });
  }
}
