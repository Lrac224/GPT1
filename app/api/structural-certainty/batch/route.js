/**
 * POST /api/structural-certainty/batch
 * Body: { symbols: string[] }
 */
export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { symbols } = body ?? {};

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return Response.json(
      {
        error: "Invalid request body",
        expected: { symbols: ["IWM", "SPY", "QQQ"] }
      },
      { status: 400 }
    );
  }

  // --- core logic placeholder ---
  const results = symbols.map((symbol) => ({
    symbol,
    structuralCertainty: "stub"
  }));

  return Response.json({
    count: results.length,
    results
  });
}
