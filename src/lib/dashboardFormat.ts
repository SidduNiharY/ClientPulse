/**
 * Shared display formatters for every dashboard surface. Centralizing these
 * keeps currency, grouping, and "N/A" handling identical across the home
 * dashboard, report preview, and the platform performance table.
 *
 * Isomorphic: safe to import from both server components and client chart
 * islands.
 */

const CURRENCY_CODE = /^[A-Z]{3}$/;

function isMissing(value: number | null | undefined): value is null | undefined {
  return value === null || value === undefined || !Number.isFinite(value);
}

/**
 * Money with a leading 3-letter currency code (e.g. `INR 9,000`). Drops
 * fractional digits at or above 1000, keeps two below. Falls back to `$` when
 * no valid currency code is supplied.
 */
export function formatMoney(
  value: number | null | undefined,
  currency?: string | null
): string {
  if (isMissing(value)) return "N/A";

  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2
  }).format(value);

  if (currency && CURRENCY_CODE.test(currency)) {
    return `${currency} ${formatted}`;
  }

  return `$${formatted}`;
}

/** Whole-number counts with thousands grouping. */
export function formatCount(value: number | null | undefined): string {
  if (isMissing(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0
  }).format(value);
}

/** Decimal-friendly counts: two decimals under 100, none at scale. */
export function formatDecimal(value: number | null | undefined): string {
  if (isMissing(value)) return "N/A";

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

/** Renders a 0..1 fraction as a percentage string (e.g. `5.60%`). */
export function formatRate(value: number | null | undefined): string {
  if (isMissing(value)) return "N/A";
  return `${(value * 100).toFixed(2)}%`;
}

/** Renders a ratio with an `x` suffix (e.g. `8.00x`). */
export function formatRatio(value: number | null | undefined): string {
  if (isMissing(value)) return "N/A";
  return `${value.toFixed(2)}x`;
}

/** Locale percentage from a fraction, one fractional digit (e.g. `15%`). */
export function formatPercent(value: number | null | undefined): string {
  if (isMissing(value)) return "N/A";

  return new Intl.NumberFormat("en", {
    style: "percent",
    maximumFractionDigits: 1
  }).format(value);
}

/**
 * The single currency code the workspace displays in cross-client views.
 * Reads `REPORT_CURRENCY` (server-side) and defaults to INR.
 */
export function resolveAppCurrency(): string {
  const fromEnv = process.env.REPORT_CURRENCY;
  if (fromEnv && CURRENCY_CODE.test(fromEnv)) {
    return fromEnv;
  }

  return "INR";
}
