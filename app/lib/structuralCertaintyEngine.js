/**
 * Structural Certainty Engine
 * ---------------------------
 * Purpose:
 *  - Authorize or deny directional risk
 *  - NO narrative
 *  - NO inference
 *  - Deterministic, repeatable
 *
 * Outputs:
 *  - bias.direction
 *  - bias.confidence (0.00 – 1.00)
 *  - executionMode (DAY | NO_TRADE)
 */

export function structuralCertaintyEngine({ chain, volume }) {
  if (!chain || !volume) {
    throw new Error("Missing inputs to structuralCertaintyEngine");
  }

  // =============================
  // Normalized Inputs
  // =============================
  const {
    totalCallOI = 0,
    totalPutOI = 0,
    callOIDelta = 0,
    putOIDelta = 0,
    dealerGamma = 0
  } = chain;

  const {
    todayVolume = 0,
    avg20Volume = 0
  } = volume;

  // =============================
  // Direction Determination
  // =============================
  let direction = "NEUTRAL";
  let drivers = [];

  if (totalCallOI > totalPutOI && callOIDelta > 0) {
    direction = "LONG_ONLY";
    drivers.push("CALL_OI_DOMINANCE");
  }

  if (totalPutOI > totalCallOI && putOIDelta > 0) {
    direction = "SHORT_ONLY";
    drivers.push("PUT_OI_DOMINANCE");
  }

  // Dealer alignment (binary, structural)
  const dealerAligned =
    (direction === "LONG_ONLY" && dealerGamma > 0) ||
    (direction === "SHORT_ONLY" && dealerGamma < 0);

  if (dealerAligned) {
    drivers.push("DEALER_ALIGNMENT");
  }

  // =============================
  // Confidence Calculation
  // (single source of truth)
  // =============================
  const oiDenominator = totalCallOI + totalPutOI;

  const oiStrength =
    oiDenominator > 0
      ? Math.abs(totalCallOI - totalPutOI) / oiDenominator
      : 0;

  const volumeStrength =
    avg20Volume > 0
      ? Math.min(1, todayVolume / avg20Volume)
      : 0;

  const dealerStrength = dealerAligned ? 1 : 0;

  const confidence = Number(
    (
      0.4 * oiStrength +
      0.3 * volumeStrength +
      0.3 * dealerStrength
    ).toFixed(2)
  );

  // =============================
  // Invalidation Rule
  // =============================
  const invalidation =
    "OI dominance flip or loss of volume participation";

  // =============================
  // HARD AUTHORIZATION GATE
  // =============================
  if (direction === "NEUTRAL" || confidence < 0.6) {
    return {
      regime: "TRANSITION",
      bias: {
        direction: "NEUTRAL",
        confidence,
        disallowed: ["LONG", "SHORT"],
        drivers: []
      },
      executionMode: "NO_TRADE",
      invalidation
    };
  }

  // =============================
  // Authorized Direction
  // =============================
  return {
    regime: "DIRECTIONAL",
    bias: {
      direction,
      confidence,
      disallowed:
        direction === "LONG_ONLY"
          ? ["SHORT"]
          : ["LONG"],
      drivers
    },
    executionMode: "DAY",
    invalidation
  };
}
