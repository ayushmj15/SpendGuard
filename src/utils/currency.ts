// Currency formatting - uses Indian number system (en-IN) by default.
// e.g. ₹1,250  ₹12,500  ₹1,25,000

const locales = new Map<string, string>([
  ["INR", "en-IN"],
  ["USD", "en-US"],
  ["EUR", "de-DE"],
  ["GBP", "en-GB"],
]);

const symbols = new Map<string, string>([
  ["INR", "₹"],
  ["USD", "$"],
  ["EUR", "€"],
  ["GBP", "£"],
]);

export function getCurrencySymbol(currency = "INR"): string {
  return symbols.get(currency) ?? `${currency} `;
}

export function formatCurrency(
  amount: number,
  currency = "INR",
  options: { decimals?: number; compact?: boolean } = {},
): string {
  const { decimals = 0, compact = false } = options;
  const safe = Number.isFinite(amount) ? amount : 0;
  const locale = locales.get(currency) ?? "en-IN";
  const symbol = symbols.get(currency) ?? "";

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "INR",
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: compact ? "compact" : "standard",
    });
    // Override symbol to a consistent one regardless of Intl output
    const formatted = formatter.format(safe);
    return symbol ? `${symbol}${formatted.replace(/[^\d.,KMBT]+/g, "")}` : formatted;
  } catch {
    return `${symbol}${safe.toLocaleString(locale)}`;
  }
}

export function formatINR(amount: number): string {
  return formatCurrency(amount, "INR");
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-IN").format(Number.isFinite(value) ? value : 0);
}

export function formatPercent(value: number, decimals = 1): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(decimals)}%`;
}
