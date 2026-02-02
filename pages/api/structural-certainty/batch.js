export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let body = req.body;

    // Turbopack / Vercel safety
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          error: "Invalid JSON body",
        });
      }
    }

    const { symbols } = body || {};

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: "Missing or invalid symbols parameter",
        example: { symbols: ["SPY", "QQQ", "IWM"] },
      });
    }

    const results = symbols.map((symbol) => ({
      symbol,
      regime: "NEUTRAL",
      direction: "NONE",
      confidence: "LOW",
      timestamp: new Date().toISOString(),
    }));

    return res.status(200).json({
      ok: true,
      type: "batch",
      count: results.length,
      results,
    });
  } catch (err) {
    console.error("BATCH ERROR:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
