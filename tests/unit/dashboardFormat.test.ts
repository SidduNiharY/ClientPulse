import { afterEach, describe, expect, it } from "vitest";
import {
  formatCount,
  formatDecimal,
  formatMoney,
  formatPercent,
  formatRate,
  formatRatio,
  resolveAppCurrency
} from "@/lib/dashboardFormat";

describe("formatMoney", () => {
  it("prefixes a 3-letter currency code and drops decimals at scale", () => {
    expect(formatMoney(9000, "INR")).toBe("INR 9,000");
  });

  it("keeps two decimals below 1000", () => {
    expect(formatMoney(9000 / 22, "INR")).toBe("INR 409.09");
  });

  it("falls back to a dollar sign without a valid currency code", () => {
    expect(formatMoney(1500)).toBe("$1,500");
  });

  it("returns N/A for null or non-finite values", () => {
    expect(formatMoney(null, "INR")).toBe("N/A");
    expect(formatMoney(Number.POSITIVE_INFINITY, "INR")).toBe("N/A");
  });
});

describe("formatCount", () => {
  it("formats integers with thousands grouping", () => {
    expect(formatCount(100000)).toBe("100,000");
  });

  it("returns N/A for nullish values", () => {
    expect(formatCount(null)).toBe("N/A");
  });
});

describe("formatDecimal", () => {
  it("keeps decimals for small numbers and drops them at scale", () => {
    expect(formatDecimal(12.5)).toBe("12.5");
    expect(formatDecimal(155)).toBe("155");
  });
});

describe("formatRate and formatRatio", () => {
  it("renders a fraction as a percentage", () => {
    expect(formatRate(0.056)).toBe("5.60%");
  });

  it("renders a ratio with an x suffix", () => {
    expect(formatRatio(8)).toBe("8.00x");
  });

  it("returns N/A for null", () => {
    expect(formatRate(null)).toBe("N/A");
    expect(formatRatio(null)).toBe("N/A");
  });
});

describe("formatPercent", () => {
  it("renders a signed-free percentage from a fraction", () => {
    expect(formatPercent(0.15)).toBe("15%");
  });

  it("returns N/A for null", () => {
    expect(formatPercent(null)).toBe("N/A");
  });
});

describe("resolveAppCurrency", () => {
  const original = process.env.REPORT_CURRENCY;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.REPORT_CURRENCY;
    } else {
      process.env.REPORT_CURRENCY = original;
    }
  });

  it("defaults to INR when unset", () => {
    delete process.env.REPORT_CURRENCY;
    expect(resolveAppCurrency()).toBe("INR");
  });

  it("uses a valid 3-letter override", () => {
    process.env.REPORT_CURRENCY = "USD";
    expect(resolveAppCurrency()).toBe("USD");
  });

  it("ignores an invalid override", () => {
    process.env.REPORT_CURRENCY = "rupees";
    expect(resolveAppCurrency()).toBe("INR");
  });
});
