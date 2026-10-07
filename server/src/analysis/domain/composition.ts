/** Largest remainder allocation; stable ID order breaks count/rounding ties. */
export function composeThoughts(
  counts: { philosopherId: string; count: number }[],
  philosophers: { id: string; name: string }[],
) {
  const ranked = counts
    .filter((c) => c.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count ||
        (BigInt(a.philosopherId) < BigInt(b.philosopherId) ? -1 : 1),
    );
  const total = ranked.reduce((sum, c) => sum + c.count, 0);
  const units = ranked.map((c) => Math.floor((c.count * 1000) / total));
  const remainder = ranked
    .map((c, i) => ({ i, fraction: (c.count * 1000) / total - units[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i);
  const remaining = 1000 - units.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining && ranked.length; i++) units[remainder[i].i]++;
  return ranked.map((c, i) => ({
    philosopherId: c.philosopherId,
    name: philosophers.find((p) => p.id === c.philosopherId)!.name,
    percent: units[i] / 10,
  }));
}
