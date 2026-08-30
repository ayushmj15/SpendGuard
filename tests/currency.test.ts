import { describe, it, expect } from "vitest";
import {
  getCurrencySymbol,
  formatCurrency,
  formatINR,
  formatNumber,
  formatPercent,
} from "@/utils/currency";

describe("getCurrencySymbol", () => {
  it("maps known currencies", () => {
    expect(getCurrencySymbol("INR")).toBe("₹");
    expect(getCurrencySymbol("USD")).toBe("$");
    expect(getCurrencySymbol("EUR")).toBe("€");
    expect(getCurrencySymbol("GBP")).toBe("£");
  });

  it("falls back for unknown currencies", () => {
    expect(getCurrencySymbol("XYZ")).toBe("XYZ ");
  });
});

describe("formatINR", () => {
  it("renders Indian grouping", () => {
    expect(formatINR(1250)).toBe("₹1,250");
    expect(formatINR(125000)).toBe("₹1,25,000");
  });

  it("handles zero", () => {
    expect(formatINR(0)).toBe("₹0");
  });
});

describe("formatCurrency", () => {
  it("applies the currency symbol override", () => {
    expect(formatCurrency(1000, "USD")).toContain("$");
    expect(formatCurrency(1000, "EUR")).toContain("€");
  });

  it("treats non-finite as 0", () => {
    expect(formatINR(NaN)).toContain("0");
  });

  it("supports decimals", () => {
    const out = formatCurrency(12.5, "INR", { decimals: 2 });
    expect(out).toContain("12.50");
  });
});

describe("formatNumber", () => {
  it("uses en-IN grouping", () => {
    expect(formatNumber(100000)).toBe("1,00,000");
  });

  it("handles non-finite values", () => {
    expect(formatNumber(NaN)).toBe("0");
  });
});

describe("formatPercent", () => {
  it("formats with default and custom decimals", () => {
    expect(formatPercent(25.5)).toBe("25.5%");
    expect(formatPercent(12.34, 2)).toBe("12.34%");
  });

  it("handles non-finite values", () => {
    expect(formatPercent(NaN)).toBe("0.0%");
  });
});
