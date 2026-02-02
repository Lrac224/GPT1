export function buildTradeChecklist(result) {
  const {
    symbol,
    mode,
    regime,
    direction,
    pc_ratio,
    allowed
  } = result;

  // ----- Execution Mode -----
  let executionMode = "NO_TRADES";
  if (direction === "SHORT_BIAS") executionMode = "Short scalps favored";
  if (direction === "LONG_BIAS") executionMode = "Long scalps favored";

  // ----- Allowed Trades -----
  const allowedTrades = [];

  if (direction === "SHORT_BIAS") {
    allowedTrades.push(
      "Short failed pops into VWAP / prior day high",
      "Sell call-side rips; avoid chasing breakdowns",
      "Favor downside momentum scalps after weak bounces",
      "Cover partials quickly at intraday supports"
    );
  }

  if (direction === "LONG_BIAS") {
    allowedTrades.push(
      "Buy pullbacks into VWAP / prior day low",
      "Favor call-side continuation after absorption",
      "Scale out into strength"
    );
  }

  // ----- Risk -----
  let primaryRisk = "None";
  if (direction === "SHORT_BIAS") {
    primaryRisk = "Sharp bear-market rallies squeezing shorts";
  }
  if (direction === "LONG_BIAS") {
    primaryRisk = "Fast liquidation drops from overhead supply";
  }

  return {
    symbol,
    mode,

    A_regime_table: {
      regime,
      pc_ratio
    },

    B_direction_gate: direction,

    C_execution_mode: executionMode,

    D_allowed_trades_today: allowedTrades,

    primary_risk: primaryRisk,

    allowed
  };
}
