export type PeriodMetrics = {
  spend: number;
  revenue: number;
  conversions: number;
  impressions: number;
  cpc: number | null;
  cpl: number | null;
  roas: number | null;
};

export type AnomalyResult = {
  anomalyType: string;
  severity: "info" | "warning" | "critical";
  message: string;
  clientSafe: boolean;
};

export function detectAnomalies(input: {
  current: PeriodMetrics;
  previous: PeriodMetrics;
  missingPlatforms: string[];
}): AnomalyResult[] {
  const anomalies: AnomalyResult[] = [];

  if (input.missingPlatforms.length > 0) {
    anomalies.push({
      anomalyType: "missing_platform_data",
      severity: "critical",
      message: `Missing data for ${input.missingPlatforms.join(", ")}`,
      clientSafe: false
    });
  }

  if (input.current.impressions === 0) {
    anomalies.push({
      anomalyType: "zero_impressions",
      severity: "critical",
      message: "Selected report range has zero impressions",
      clientSafe: false
    });
  }

  if (input.current.conversions === 0 && input.current.spend > 0) {
    anomalies.push({
      anomalyType: "zero_conversions",
      severity: "warning",
      message: "Spend was recorded but conversions are zero",
      clientSafe: true
    });
  }

  if (
    input.previous.spend > 0 &&
    input.current.spend / input.previous.spend >= 1.5
  ) {
    anomalies.push({
      anomalyType: "spend_spike",
      severity: "warning",
      message:
        "Spend increased by at least 50% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.revenue > 0 &&
    input.current.revenue / input.previous.revenue <= 0.7
  ) {
    anomalies.push({
      anomalyType: "revenue_drop",
      severity: "warning",
      message:
        "Revenue dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.conversions > 0 &&
    input.current.conversions / input.previous.conversions <= 0.7
  ) {
    anomalies.push({
      anomalyType: "conversion_drop",
      severity: "warning",
      message:
        "Conversions dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.impressions > 0 &&
    input.current.impressions / input.previous.impressions <= 0.7
  ) {
    anomalies.push({
      anomalyType: "impression_drop",
      severity: "warning",
      message:
        "Impressions dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.cpc &&
    input.current.cpc &&
    input.current.cpc / input.previous.cpc >= 1.5
  ) {
    anomalies.push({
      anomalyType: "cpc_spike",
      severity: "warning",
      message: "CPC increased by at least 50% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.cpl &&
    input.current.cpl &&
    input.current.cpl / input.previous.cpl >= 1.5
  ) {
    anomalies.push({
      anomalyType: "cpl_spike",
      severity: "warning",
      message: "CPL increased by at least 50% compared with the previous period",
      clientSafe: true
    });
  }

  if (
    input.previous.roas &&
    input.current.roas &&
    input.current.roas / input.previous.roas <= 0.7
  ) {
    anomalies.push({
      anomalyType: "roas_drop",
      severity: "warning",
      message: "ROAS dropped by at least 30% compared with the previous period",
      clientSafe: true
    });
  }

  return anomalies;
}
