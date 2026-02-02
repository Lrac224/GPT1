// pages/api/structural-certainty/batch.js

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    if (!req.body) {
      return res.status(400).json({
        error: "Request body missing",
        example: { symbols: ["IWM", "SPY", "QQQ"] }
      });
    }

    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        error: "Missing or invalid symbols parameter",
        example: { symbols: ["IWM", "SPY", "QQQ"] }
      });
    }

    // ---- TEMP STRUCTURAL MOCK (replace later) ----
    const results = symbols.map((symbol) => ({
      symbol,
      regime: "BALANCED",
      direction: "NEUTRAL",
      confidence: 50,
      allowed_trades: ["mean_reversion"]
    }));

    return res.status(200).json({
      ok: true,
      count: results.length,
      data: results
    });

  } catch (err) {
    return res.status(500).json({
      error: "Structural certainty batch failed",
      detail: err.message
    });
  }
}
