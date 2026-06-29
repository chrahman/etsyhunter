const LISTING_PATH = /\/listing\/(\d+)/;
const SEARCH_PATH = /\/(search|c\/|market\/|featured)/;

export function isListingPage(url: string = window.location.href): boolean {
  try {
    return LISTING_PATH.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

export function isSearchPage(url: string = window.location.href): boolean {
  try {
    const { pathname, searchParams } = new URL(url);
    if (SEARCH_PATH.test(pathname)) return true;
    return pathname === '/' && searchParams.has('q');
  } catch {
    return false;
  }
}

export function getPageType(url: string = window.location.href): 'listing' | 'search' | 'other' {
  if (isListingPage(url)) return 'listing';
  if (isSearchPage(url)) return 'search';
  return 'other';
}

export function extractListingId(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(LISTING_PATH);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractSearchQuery(url: string = window.location.href): string | null {
  try {
    const parsed = new URL(url);
    const q = parsed.searchParams.get('q');
    if (q) return decodeURIComponent(q.replace(/\+/g, ' '));
    const category = parsed.pathname.match(/\/c\/([^/?]+)/)?.[1];
    if (category) return decodeURIComponent(category.replace(/-/g, ' '));
    return null;
  } catch {
    return null;
  }
}

export function extractShopUsername(url: string): string | null {
  try {
    const match = new URL(url).pathname.match(/\/shop\/([^/?]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function parseNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d.,]/g, '').replace(/,/g, '');
  const value = parseFloat(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function parseCompactNumber(text: string | null | undefined): number | null {
  if (!text) return null;
  const normalized = text.trim().toLowerCase();
  const match = normalized.match(/([\d.]+)\s*([km])?/);
  if (!match) return parseNumber(text);

  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return null;

  const suffix = match[2];
  if (suffix === 'k') return Math.round(base * 1_000);
  if (suffix === 'm') return Math.round(base * 1_000_000);
  return Math.round(base);
}

export function detectCurrency(text: string): string {
  if (text.includes('$')) return 'USD';
  if (text.includes('£')) return 'GBP';
  if (text.includes('€')) return 'EUR';
  return 'USD';
}

export function queryText(root: ParentNode, selectors: string[]): string | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return null;
}

export function parseDisplayDate(text: string): Date | null {
  const trimmed = text.trim();
  const match =
    trimmed.match(/(\d{1,2})\s+(\w+),?\s+(\d{4})/i) ??
    trimmed.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);

  if (!match) return null;

  const date =
    /^\d/.test(match[1])
      ? new Date(`${match[2]} ${match[1]}, ${match[3]}`)
      : new Date(`${match[1]} ${match[2]}, ${match[3]}`);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function parseAgeToDays(text: string | null): number | null {
  if (!text) return null;
  const lower = text.trim().toLowerCase();

  const decimalYearsMatch = lower.match(/([\d.]+)\s*years?/);
  if (decimalYearsMatch) return Math.round(parseFloat(decimalYearsMatch[1]) * 365);

  const monthsMatch = lower.match(/([\d.]+)\s*months?/);
  if (monthsMatch) return Math.round(parseFloat(monthsMatch[1]) * 30);

  const listedMatch = text.match(/listed on\s+(.+)/i);
  if (listedMatch) {
    const date = parseDisplayDate(listedMatch[1]);
    if (date) {
      return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)));
    }
  }

  const displayDate = parseDisplayDate(text);
  if (displayDate) {
    return Math.max(0, Math.floor((Date.now() - displayDate.getTime()) / (1000 * 60 * 60 * 24)));
  }

  return null;
}

export function parseJsonLdScripts(doc: Document = document): unknown[] {
  const items: unknown[] = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
    try {
      const data = JSON.parse(script.textContent ?? '');
      if (Array.isArray(data)) items.push(...data);
      else items.push(data);
    } catch {
      // ignore malformed JSON-LD
    }
  });
  return items;
}
