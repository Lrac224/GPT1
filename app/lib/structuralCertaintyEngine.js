/**
 * Structural Certainty Engine
 * Uses ChartExchange chain-summary + short volume
 * Front-month expiration is IMPLIED by chain-summary
 */

import { fetchShortVolume } from "./fetchShortVolume";

export async function structuralCertaintyEngine({
  symbol,
  chain,
  exchangeVolume // left untouched, not used here
}) {
  // ---------- FAIL FAST ----------
  if (!chain) {
    return {
      symbol,
      regime: "UNKNOWN",
      bias: {
        direction: "NO_TRADE",
        confidence: 0,
        disallowed: ["LONG", "SHORT"],
        drivers: ["missing_chain_data"]
      },
      invalidation: "Chain summary unavailable"
    };
  }

  const {
    pc_ratio,
    calls_total,
    puts_total,
    itm_calls = 0,
    itm_puts = 0,
    max_pain
  } = chain;

  // ---------- FETCH SHORT VOLUME ----------
  const shortVol = await fetchShortVolume(symbol);

  let shortVolumeState = "unknown";
  if (shortVol?.shortPct != null) {
    if (shortVol.shortPct >= 0.45) shortVolumeState = "elevated";
    else if (shortVol.shortPct <= 0.30) shortVolumeState = "light";
    else shortVolumeState = "neutral";
  }

  // ---------- REGIME CLASSIFICATION ----------
  let regime = "MIXED";
  const drivers = [];

  if (pc_ratio >= 1.6) {
    regime = "BEAR_CONTROLLED";
    drivers.push("heavy_put_dominance");
  } else if (pc_ratio <= 0.65) {
    regime = "BULL_CONTROLLED";
    drivers.push("heavy_call_dominance");
  }

  // ---------- DIRECTION GATE ----------
  let direction = "NO_TRADE";
  let disallowed = ["LONG", "SHORT"];

  if (regime === "BEAR_CONTROLLED") {
    // Only allow bearish bias if shorts are ACTIVE
    if (shortVolumeState === "elevated") {
      direction = "SHORT_BIAS_INTRADAY";
      disallowed = ["LONG"];
      drivers.push("active_short_pressure");
    } else {
      drivers.push("puts_likely_hedges");
    }
  }

  if (regime === "BULL_CONTROLLED") {
    // Bullish bias requires shorts to be light
    if (shortVolumeState === "light") {
      direction = "LONG_BIAS_INTRADAY";
      disallowed = ["SHORT"];
      drivers.push("low_short_supply");
    } else {
      drivers.push("shorts_not_exhausted");
    }
  }

  // ---------- CONFIDENCE MODEL ----------
  let confidence = 0;

  // Base PC contribution
  if (pc_ratio >= 1.6) {
    confidence += Math.min(40, (pc_ratio - 1) * 20);
  }

  if (pc_ratio <= 0.65) {
    confidence += Math.min(40, (1 - pc_ratio) * 20);
  }

  // Flow imbalance
  if (calls_total > 0 && puts_total > 0) {
    const flowImbalance =
      Math.abs(calls_total - puts_total) /
      (calls_total + puts_total);
    confidence += flowImbalance * 30;
  }

  // ITM imbalance (confirmation only)
  if (itm_calls + itm_puts > 0) {
    const itmImbalance =
      Math.abs(itm_calls - itm_puts) /
      (itm_calls + itm_puts);
    confidence += itmImbalance * 30;
  }

  confidence = Math.min(100, Math.round(confidence));

  // ---------- CONFIDENCE FLOOR ----------
  if (confidence < 12) {
    direction = "NO_TRADE";
    disallowed = ["LONG", "SHORT"];
    drivers.push("low_structural_conviction");
  }

  // ---------- EXECUTION MODE ----------
  let execution = "NONE";

  if (direction === "SHORT_BIAS_INTRADAY") {
    execution = "Short scalps favored; sell failed pops";
  }

  if (direction === "LONG_BIAS_INTRADAY") {
    execution = "Long scalps favored; buy dips above VWAP";
  }

  // ---------- OUTPUT ----------
  return {
    symbol,
    regime,
    pc_ratio,
    calls_total,
    puts_total,
    max_pain,
    pressure: {
      short_volume: shortVolumeState
    },
    bias: {
      direction,
      confidence,
      disallowed,
      drivers
    },
    execution,
    invalidation:
      "PC ratio normalization or ITM dominance flip"
  };
}
