import { NextResponse } from "next/server";
import { fetchChainSummary } from "../../../lib/fetchChainSummary";
import { fetchExchangeVolume } from "../../../lib/fetchExchangeVolume";
import { fetchOptionExpirations } from "../../../lib/fetchOptionExpirations";
import { getNearestExpiration } from "../../../lib/getNearestExpiration";
import { structuralCertaintyEngine } from "../../../lib/structuralCertaintyEngine";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get("symbol") || "").toUpperCase();
    if (!symbol) {
      return NextResponse.json({ error: "symbol required" }, { status: 400 });
    }

    const apiKey = process.env.CHARTEXCHANGE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing CHARTEXCHANGE_API_KEY env var" },
        { status: 500 }
      );
    }

    const expirations = await fetchOptionExpirations(symbol);
    const expiration = getNearestExpiration(expirations);
    if (!expiration) {
      return NextResponse.json(
        { error: "No valid option expiration", symbol },
        { status: 500 }
      );
    }

    const chain = await fetchChainSummary(symbol, expiration, apiKey);
    const volume = await fetchExchangeVolume(symbol, apiKey);

    const { bias, invalidation } = structuralCertaintyEngine({ chain, volume });

    return NextResponse.json({
      symbol,
      timeframe: "2H",
      expiration,
      bias,
      invalidation
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
