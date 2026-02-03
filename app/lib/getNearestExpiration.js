export function getNearestExpiration(expirations = []) {
  const today = new Date().toISOString().slice(0, 10);

  // Prefer standard monthly (3rd Friday)
  const isThirdFriday = (d) => {
    const dt = new Date(d + "T00:00:00Z");
    return dt.getUTCDay() === 5 && dt.getUTCDate() >= 15 && dt.getUTCDate() <= 21;
  };

  const future = expirations.filter(d => d >= today).sort();

  const frontMonth = future.find(isThirdFriday);
  return frontMonth ?? future[0] ?? null;
}
