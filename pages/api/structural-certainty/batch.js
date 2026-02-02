export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { symbols } = req.body || {};

  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid symbols parameter",
      example: { symbols: ["SPY", "QQQ", "IWM"] }
    });
  }

  return res.status(200).json({
    source: "structural-certainty-batch",
    symbols,
    timestamp: Date.now()
  });
}
