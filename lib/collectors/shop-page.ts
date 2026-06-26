import type { ShopListing } from '../types/shop';
import {
  extractListingId,
  parseAgeToDays,
  parseCompactNumber,
  parseJsonLdScripts,
  parseNumber,
} from './utils';

export interface ShopPageData {
  activeListings: number | null;
  topListings: ShopListing[];
  averageRating: number | null;
  totalReviews: number | null;
  totalSales: number | null;
  shopAgeDays: number | null;
}

export interface ShopHighlights {
  averageRating: number | null;
  totalReviews: number | null;
  totalSales: number | null;
  shopAgeDays: number | null;
}

export function parseShopHighlightsFromDocument(doc: Document): ShopHighlights {
  const ratingHighlight = doc.querySelector('[data-highlight="rating"]');
  const salesHighlight = doc.querySelector('[data-highlight="sales"]');
  const etsyHighlight = doc.querySelector('[data-highlight="on_etsy"]');

  let averageRating: number | null = null;
  let totalReviews: number | null = null;

  if (ratingHighlight) {
    const ratingAttr = ratingHighlight.querySelector('[data-rating]')?.getAttribute('data-rating');
    const ratingText =
      ratingHighlight.querySelector('.rating-and-reviews-count__avg-rating')?.textContent?.trim() ??
      ratingAttr;
    averageRating = ratingText ? parseNumber(ratingText) : null;

    const reviewsText =
      ratingHighlight.querySelector('.rating-and-reviews-count__reviews-count')?.textContent?.trim() ??
      '';
    const reviewsMatch = reviewsText.match(/\(([\d,.]+[km]?)\)/i);
    totalReviews = reviewsMatch
      ? parseCompactNumber(reviewsMatch[1])
      : parseCompactNumber(reviewsText.replace(/[()]/g, ''));
  }

  let totalSales: number | null = null;
  if (salesHighlight) {
    const salesText = salesHighlight.querySelector('.highlight__primary-content')?.textContent?.trim();
    totalSales = salesText ? parseCompactNumber(salesText) : null;
  }

  let shopAgeDays: number | null = null;
  if (etsyHighlight) {
    const ageText = etsyHighlight.querySelector('.highlight__primary-content')?.textContent?.trim();
    shopAgeDays = parseAgeToDays(ageText ?? null);
  }

  return { averageRating, totalReviews, totalSales, shopAgeDays };
}

function parseItemListJsonLd(items: unknown[]): Pick<ShopPageData, 'activeListings' | 'topListings'> {
  let activeListings: number | null = null;
  const topListings: ShopListing[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (obj['@type'] !== 'ItemList') continue;

    if (obj.numberOfItems != null) {
      activeListings = parseNumber(String(obj.numberOfItems));
    }

    const elements = obj.itemListElement;
    const list = Array.isArray(elements) ? elements : elements ? [elements] : [];

    for (const el of list) {
      if (typeof el !== 'object' || el === null) continue;
      const entry = el as Record<string, unknown>;
      const product = (entry.item ?? entry) as Record<string, unknown>;
      if (product['@type'] !== 'Product' && !product.name) continue;

      const url = String(product.url ?? product['@id'] ?? '');
      const listingId = extractListingId(url) ?? String(product.sku ?? '');
      if (!listingId) continue;

      const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
      let price = 0;
      let currency = 'USD';
      if (offer && typeof offer === 'object') {
        const o = offer as Record<string, unknown>;
        price = parseNumber(String(o.price)) ?? 0;
        currency = String(o.priceCurrency ?? 'USD');
      }

      const images = product.image;
      const imageUrl = Array.isArray(images) ? String(images[0]) : typeof images === 'string' ? images : null;

      topListings.push({
        listingId,
        title: String(product.name ?? 'Untitled'),
        url: url || `https://www.etsy.com/listing/${listingId}`,
        imageUrl,
        price,
        currency,
      });
    }

    if (activeListings != null || topListings.length > 0) break;
  }

  return { activeListings, topListings: topListings.slice(0, 20) };
}

export function parseShopPageHtml(html: string): ShopPageData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const items = parseJsonLdScripts(doc);
  const catalog = parseItemListJsonLd(items);
  const highlights = parseShopHighlightsFromDocument(doc);

  return {
    ...catalog,
    ...highlights,
  };
}

/**
 * Fetch shop page from the Etsy content script (same tab session).
 * Background/service-worker fetch gets 403 — no cookies or same-site context.
 */
export async function fetchShopPage(shopUsername: string): Promise<ShopPageData | null> {
  const url = `https://www.etsy.com/shop/${encodeURIComponent(shopUsername)}`;

  const html = await requestShopHtml(url);
  if (html) return parseShopPageHtml(html);

  const fallbackHtml = await requestShopHtmlInPageContext(url);
  if (fallbackHtml) return parseShopPageHtml(fallbackHtml);

  return null;
}

async function requestShopHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      credentials: 'include',
      cache: 'no-cache',
      redirect: 'follow',
      referrer: typeof window !== 'undefined' ? window.location.href : undefined,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Run fetch in the page main world so it uses the tab's full cookie/session.
 */
function requestShopHtmlInPageContext(url: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const eventId = `etsy-research-shop-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const timeout = window.setTimeout(() => {
      window.removeEventListener('message', onMessage);
      resolve(null);
    }, 15_000);

    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.type !== eventId) return;
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timeout);
      resolve(typeof event.data.html === 'string' ? event.data.html : null);
    };

    window.addEventListener('message', onMessage);

    const script = document.createElement('script');
    script.textContent = `
      (function() {
        fetch(${JSON.stringify(url)}, { credentials: 'include', cache: 'no-cache' })
          .then(function(r) { return r.ok ? r.text() : null; })
          .then(function(html) {
            window.postMessage({ type: ${JSON.stringify(eventId)}, html: html }, '*');
          })
          .catch(function() {
            window.postMessage({ type: ${JSON.stringify(eventId)}, html: null }, '*');
          });
      })();
    `;
    (document.head ?? document.documentElement).appendChild(script);
    script.remove();
  });
}
