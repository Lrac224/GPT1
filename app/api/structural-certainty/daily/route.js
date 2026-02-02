import { NextResponse } from "next/server";

const DEFAULT_SYMBOLS = ["SPY", "QQQ", "IWM"];

// --- simple helpers ---
function pctMove(a, b) {
  if (!a || !b) return 0;
  return Math.abs((a - b) / b);
}

export async function POST(req) {
  let symbols = DEFAULT_SYMBOLS;

  try {
    const body = await req.json();
    if (Array.isArray(body?.symbols) && body.symbols.length > 0) {
      symbols = body.symbols;
    }
  } catch (_) {}

  const apiKey = process.env.CHARTEXCHANGE_API_KEY;

  // ─────────────────────────────
  // BASE SAFE RESPONSE (NO BIAS)
  // ─────────────────────────────
  const response = {
    stressMap: {
      stress_side: "NEUTRAL",
      stress_location: "STRADDLED",
      distance_to_stress: "FAR",
      authority: "LOW",
    },
    openResolution: {
      open_state: "UNRESOLVED",
      interaction_with_stress: "NO",
      early_volatility: "NORMAL",
    },
    riskPermission: {
      permission: "BLOCK",
      size_cap: "MINIMAL",
      hold_cap: "OPEN_ONLY",
      blocked_behaviors: ["REVERSAL", "FADE", "HOLD"],
    },
    executionGate: {
      daily_alignment: "UNKNOWN",
      checklist_complete: "NO",
      allowed_setups: [],
      primary_risk: "Insufficient structural confirmation",
      final_instruction: "NO_TRADE",
    },
  };

  if (!apiKey) {
    return NextResponse.json(response);
  }

  try {
    for (const symbol of symbols) {
      // ───────── Tool 1: Stress (front expiry only) ─────────
      const chainUrl =
        `https://chartexchange.com/api/v1/data/options/chain-summary/` +
        `?symbol=${symbol}&format=json&api_key=${apiKey}`;

      const chainRes = await fetch(chainUrl, { cache: "no-store" });
      if (chainRes.ok) {
        const chain = await chainRes.json();
        const row = chain?.[0];

        if (row?.callsTotal && row?.putsTotal) {
          response.stressMap = {
            stress_side:
              row.putsTotal > row.callsTotal
                ? "PUT"
                : row.callsTotal > row.putsTotal
                ? "CALL"
                : "NEUTRAL",
            stress_location: "STRADDLED",
            distance_to_stress: "MID",
            authority: "HIGH",
          };
        }
      }

      // ───────── Tool 2: Open Resolution (price behavior) ─────────
      const quoteUrl =
        `https://chartexchange.com/api/v1/quotes/${symbol}?api_key=${apiKey}`;

      const quoteRes = await fetch(quoteUrl, { cache: "no-store" });
      if (!quoteRes.ok) continue;

      const q = await quoteRes.json();
      const last = q?.last;
      const prevClose = q?.prevClose;
      const open = q?.open;

      const openMove = pctMove(open, prevClose);
      const lastMove = pctMove(last, prevClose);

      // --- classify ---
      if (openMove > 0.003 && lastMove >= openMove) {
        response.openResolution = {
          open_state: "DISPLACING",
          interaction_with_stress: "NO",
          early_volatility: "EXPANDING",
        };

        response.riskPermission = {
          permission: "RESTRICT",
          size_cap: "MINIMAL",
          hold_cap: "OPEN_ONLY",
          blocked_behaviors: ["REVERSAL", "FADE", "HOLD"],
        };

        response.executionGate.primary_risk =
          "Open displacement overriding structural stress";
      } else if (openMove > 0.001) {
        response.openResolution = {
          open_state: "RESOLVING",
          interaction_with_stress: "YES",
          early_volatility: "NORMAL",
        };

        response.riskPermission.permission = "RESTRICT";
      }
    }

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(response);
  }
}
