export type MetricTotals = {
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  conversionValue: number;
  revenue: number;
  orders: number;
  leads: number;
};

export type DerivedMetrics = {
  ctr: number | null;
  cpc: number | null;
  cpl: number | null;
  conversionRate: number | null;
  aov: number | null;
  roas: number | null;
  mer: number | null;
  revenuePerAdClick: number | null;
};

export type RevenueSource =
  | "shopify"
  | "ga4"
  | "google_ads_conversion_value"
  | "meta_purchase_value"
  | "manual";

function divide(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

export function calculateDerivedMetrics(input: {
  adTotals: MetricTotals;
  selectedRevenue: number;
  totalMarketingSpend: number;
}): DerivedMetrics {
  return {
    ctr: divide(input.adTotals.clicks, input.adTotals.impressions),
    cpc: divide(input.adTotals.spend, input.adTotals.clicks),
    cpl: divide(input.adTotals.spend, input.adTotals.leads),
    conversionRate: divide(input.adTotals.conversions, input.adTotals.clicks),
    aov: divide(input.selectedRevenue, input.adTotals.orders),
    roas: divide(input.selectedRevenue, input.adTotals.spend),
    mer: divide(input.selectedRevenue, input.totalMarketingSpend),
    revenuePerAdClick: divide(input.selectedRevenue, input.adTotals.clicks)
  };
}

export function resolveSelectedRevenue(input: {
  revenueSource: RevenueSource;
  shopifyRevenue: number;
  ga4Revenue: number;
  googleAdsConversionValue: number;
  metaPurchaseValue: number;
  manualRevenue: number;
}): number {
  const map = {
    shopify: input.shopifyRevenue,
    ga4: input.ga4Revenue,
    google_ads_conversion_value: input.googleAdsConversionValue,
    meta_purchase_value: input.metaPurchaseValue,
    manual: input.manualRevenue
  };

  return map[input.revenueSource];
}
