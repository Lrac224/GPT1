export function structuralCertaintyEngine({ chain, volume }) {
  if (!chain || !volume) {
    throw new Error("Missing inputs to structuralCertaintyEngine");
  }

  // -----------------------------
  // Destructure normalized inputs
  // -----------------------------
  const {
    totalCallOI,
    totalPutOI,
    callOIDelta,
    putOIDelta,
    dealerGamma
  } = chain;

  const {
    todayVolume,
    avg20Volume
  } = volume;

  // -----------------------------
  // Directional determination
  // -----------------------------
  let direction = "NEUTRAL";
  let drivers = [];

  if (totalCallOI > totalPutOI && callOIDelta > 0) {
    direction = "LONG_ONLY";
    drivers.push("CALL_OI_DOMINANCE");
  } else if (totalPutOI > totalCallOI && putOIDelta > 0) {
    direction = "SHORT_ONLY";
    drivers.push("PUT_OI_DOMINANCE");
  }

  // Dealer positioning
  const positiveDealer = dealerGamma > 0;
  const negativeDealer = dealerGamma < 0;

  if (direction === "LONG_ONLY" && positiveDealer) {
    drivers.push("DEALER_LONG_ALIGNMENT");
  }

  if (direction === "SHORT_ONLY" && negativeDealer) {
    drivers.push("DEALER_SHORT_ALIGNMENT");
  }

  // -----------------------------
  // Confidence calculation
  // (SINGLE SOURCE OF TRUTH)
  // -----------------------------
  const oiDenom = totalCallOI + totalPutOI;
  const oiStrength =
    oiDenom > 0
      ? Math.abs(totalCallOI - totalPutOI) / oiDenom
      : 0;

  const volumeStrength =
    avg20Volume > 0
      ? Math.min(1, todayVolume / avg20Volume)
      : 0;

  const dealerAlignment =
    direction === "LONG_ONLY"
      ? (positiveDealer ? 1 : 0)
      : direction === "SHORT_ONLY"
      ? (negativeDealer ? 1 : 0)
      : 0;

  const confidence = Number(
    (
      0.4 * oiStrength +
      0.3 * volumeStrength +
      0.3 * dealerAlignment
    ).toFixed(2)
  );

  // -----------------------------
  // Invalidation logic
  // -----------------------------
  const invalidation =
    "OI dominance flip or loss of exchange volume expansion";

  // -----------------------------
  // HARD NO-TRADE ENFORCEMENT
  // -----------------------------
  if (confidence < 0.6 || direction === "NEUTRAL") {
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

  // -----------------------------
  // Directional return (allowed)
  // -----------------------------
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
