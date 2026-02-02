import { NextResponse } from "next/server";

export async function POST(req) {
  let symbol = null;

  try {
    const body = await req.json();
    symbol = body?.symbol;
  } catch (_) {}

  if (!symbol) {
    return NextResponse.json({
      status: "ERROR",
      reason: "symbol_required",
      swingAllowed: false,
    });
  }

  // --- Call DAILY internally ---
  const dailyRes = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/structural-certainty/daily`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symbols: [symbol] }),
      cache: "no-store",
    }
  );

  const daily = await dailyRes.json();

  const bias = daily?.directionGate?.[symbol];

  if (!bias) {
    return NextResponse.json({
      symbol,
      swingAllowed: false,
      reason: "daily_alignment_missing",
      status: "BLOCKED",
    });
  }

  // --- Simple deterministic swing logic ---
  const swingBias =
    bias === "SHORT_BIAS_INTRADAY" ? "SHORT_SWING_ONLY" : "NO_SWING";

  return NextResponse.json({
    symbol,
    dailyBias: bias,
    swingBias,
    executionWindow: "2–5 days",
    preferredStructures: [
      "Failed bounce into resistance",
      "Put-side dominance with flat call OI",
    ],
    invalidation: "Strong trend reclaim against bias",
    status: "SWING_ENABLED",
  });
}
