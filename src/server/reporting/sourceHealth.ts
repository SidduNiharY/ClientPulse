import type {
  NormalizedMetricRow,
  Platform
} from "@/server/connectors/types";

export type SourceHealthWarning = {
  warningType: "missing_platform" | "stale_data";
  severity: "warning" | "critical";
  platform: Platform;
  message: string;
  clientSafe: boolean;
};

export type SourceFreshnessContext = {
  latestImportedAt: string | null;
  stalePlatforms: Platform[];
  checkedAt: string;
  maxFreshnessHours: number;
};

export function preflightReportSourceHealth(input: {
  rows: NormalizedMetricRow[];
  expectedPlatforms: Platform[];
  checkedAt: string | Date;
  maxFreshnessHours?: number;
}): {
  warnings: SourceHealthWarning[];
  freshness: SourceFreshnessContext;
} {
  const warnings: SourceHealthWarning[] = [];
  const checkedAt = toDate(input.checkedAt);
  const maxFreshnessHours = input.maxFreshnessHours ?? 48;
  const stalePlatforms: Platform[] = [];
  const latestByPlatform = new Map<Platform, Date>();
  const rowsByPlatform = new Map<Platform, NormalizedMetricRow[]>();

  for (const row of input.rows) {
    rowsByPlatform.set(row.platform, [
      ...(rowsByPlatform.get(row.platform) ?? []),
      row
    ]);

    const importedAt = toDate(row.sourceTrace.importedAt);
    const currentLatest = latestByPlatform.get(row.platform);

    if (!currentLatest || importedAt > currentLatest) {
      latestByPlatform.set(row.platform, importedAt);
    }
  }

  for (const platform of input.expectedPlatforms) {
    const platformRows = rowsByPlatform.get(platform) ?? [];

    if (platformRows.length === 0) {
      warnings.push({
        warningType: "missing_platform",
        severity: "critical",
        platform,
        message: `Missing data for ${platform}`,
        clientSafe: false
      });
      continue;
    }

    const latestImportedAt = latestByPlatform.get(platform);

    if (
      latestImportedAt &&
      ageInHours(latestImportedAt, checkedAt) > maxFreshnessHours
    ) {
      stalePlatforms.push(platform);
      warnings.push({
        warningType: "stale_data",
        severity: "warning",
        platform,
        message: `${platform} data is older than ${maxFreshnessHours} hours`,
        clientSafe: false
      });
    }
  }

  const latestImportedAt = latestDate(Array.from(latestByPlatform.values()));

  return {
    warnings,
    freshness: {
      latestImportedAt: latestImportedAt?.toISOString() ?? null,
      stalePlatforms,
      checkedAt: checkedAt.toISOString(),
      maxFreshnessHours
    }
  };
}

function ageInHours(importedAt: Date, checkedAt: Date) {
  return (checkedAt.getTime() - importedAt.getTime()) / (60 * 60 * 1000);
}

function latestDate(dates: Date[]) {
  return dates.reduce<Date | null>(
    (latest, date) => (!latest || date > latest ? date : latest),
    null
  );
}

function toDate(value: string | Date) {
  return value instanceof Date ? value : new Date(value);
}
