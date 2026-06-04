export type DataQualityInput = {
  selectedSourcesSynced: boolean;
  dataFresh: boolean;
  revenueSourceAvailable: boolean;
  hasCriticalMissingMetrics: boolean;
  hasExpiredToken: boolean;
  rawRowsStored: boolean;
};

export function scoreDataQuality(input: DataQualityInput): {
  score: number;
  rating: "good" | "needs_review" | "poor";
  factors: Record<string, boolean>;
} {
  let score = 100;

  if (!input.selectedSourcesSynced) score -= 25;
  if (!input.dataFresh) score -= 20;
  if (!input.revenueSourceAvailable) score -= 25;
  if (input.hasCriticalMissingMetrics) score -= 20;
  if (input.hasExpiredToken) score -= 20;
  if (!input.rawRowsStored) score -= 10;

  const boundedScore = Math.max(0, score);
  const rating =
    boundedScore >= 80
      ? "good"
      : boundedScore >= 50
        ? "needs_review"
        : "poor";

  return {
    score: boundedScore,
    rating,
    factors: input
  };
}
