import { NextResponse } from "next/server";

import { structuralCertaintyEngine } from "../../../lib/structuralCertaintyEngine";
import { dailyNarrativeBuilder } from "../../../lib/dailyNarrativeBuilder";
import { fetchChainSummary } from "../../../lib/fetchChainSummary";
import { fetchExchangeVolume } from "../../../lib/fetchExchangeVolume";
import { resolveFrontMonthExpiration } from "../../../lib/resolveFrontMonthExpiration";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "Missing symbol parameter" },
        { status: 400 }
      );
    }

    const apiKey = process.env.CHARTEXCHANGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing CHARTEXCHANGE_API_KEY" },
        { status: 500 }
      );
    }

    // ---- REQUIRED: you must resolve expiration BEFORE chain fetch
    const expiration = await resolveFrontMonthExpiration(symbol, apiKey);
    if (!expiration) {
      return NextResponse.json(
        { error: "Failed to resolve expiration" },
        { status: 500 }
      );
    }

    const chain = await fetchChainSummary(symbol, expiration, apiKey);
    const volume = await fetchExchangeVolume(symbol, apiKey);

    if (!chain || !volume) {
      return NextResponse.json(
        { error: "Failed to fetch market data" },
        { status: 500 }
      );
    }

    const structuralCertainty = structuralCertaintyEngine({
      chain,
      volume
    });

    const dailyNarrative = dailyNarrativeBuilder({
      symbol,
      chain,
      regime: structuralCertainty.regime
    });

    // ✅ THIS RETURN IS MANDATORY
    return NextResponse.json({
      symbol,
      structuralCertainty,
      dailyNarrative
    });

  } catch (err) {
    // ✅ THIS CATCH IS MANDATORY
    return NextResponse.json(
      { error: err.message || "Unhandled error" },
      { status: 500 }
    );
  }
}
