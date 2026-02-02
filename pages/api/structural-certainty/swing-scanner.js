export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { universe } = req.body || {};

  if (!Array.isArray(universe) || universe.length === 0) {
    return res.status(400).json({
      error: "Missing or invalid universe parameter",
      example: { universe: ["SPY", "QQQ", "IWM"] }
    });
  }

  return res.status(200).json({
    source: "structural-certainty-swing",
    universe,
    timestamp: Date.now()
  });
}
