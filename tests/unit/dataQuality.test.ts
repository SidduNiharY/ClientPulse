import { scoreDataQuality } from "@/server/reporting/dataQuality";
import { describe, expect, it } from "vitest";

describe("scoreDataQuality", () => {
  it("marks a report poor when revenue is missing and data is stale", () => {
    const result = scoreDataQuality({
      selectedSourcesSynced: true,
      dataFresh: false,
      revenueSourceAvailable: false,
      hasCriticalMissingMetrics: false,
      hasExpiredToken: false,
      rawRowsStored: true
    });

    expect(result.score).toBe(55);
    expect(result.rating).toBe("needs_review");
  });
});
