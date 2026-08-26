export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Prices are stored as integer minor units + a currency code, so formatting is
 * the only place the decimal point appears. Null means "price on request".
 */
export function formatPrice(
  cents: number | null | undefined,
  currency = "ZAR"
): string | null {
  if (cents == null) return null;
  try {
    return new Intl.NumberFormat("en-ZA", {
      style: "currency",
      currency,
      minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    }).format(cents / 100);
  } catch {
    // Unknown currency code — still show a number rather than nothing.
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
