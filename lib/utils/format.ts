export function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(price);
  } catch {
    return `${currency} ${price.toFixed(2)}`;
  }
}

export function formatNumber(value: number | null | undefined) {
  if (value == null) return 'N/A';
  return new Intl.NumberFormat().format(Math.round(value));
}

export function formatCompact(value: number | null | undefined) {
  if (value == null) return 'N/A';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return formatNumber(value);
}

export function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

export function formatDays(days: number | null) {
  if (days == null) return 'N/A';
  if (days >= 365) {
    const years = days / 365;
    return Number.isInteger(years) ? `${years}y` : `${years.toFixed(1)}y`;
  }
  if (days >= 30) return `${Math.round(days / 30)}mo`;
  return `${days}d`;
}
