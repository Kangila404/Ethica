export const DAILY_GENERATION_LIMIT = 3;
export function generationQuota(
  summary: {
    generationDate?: string | null;
    generationAttempts?: number;
  } | null,
  now = new Date(),
) {
  const date = new Date(now.getTime() + 9 * 3600000).toISOString().slice(0, 10);
  return {
    date,
    limit: DAILY_GENERATION_LIMIT,
    remaining: Math.max(
      0,
      DAILY_GENERATION_LIMIT -
        (summary?.generationDate === date
          ? (summary.generationAttempts ?? 0)
          : 0),
    ),
    resetsAt: new Date(
      new Date(`${date}T00:00:00+09:00`).getTime() + 86400000,
    ).toISOString(),
  };
}
