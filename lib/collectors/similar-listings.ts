import type { ListingData } from '../types/listing';
import type { CompetitorMatch } from '../types/analytics';
import {
  detectCurrency,
  extractListingId,
  parseCompactNumber,
  parseNumber,
  queryText,
} from './utils';

interface EtsyRecEventData {
  scores?: number[];
  listing_ids?: number[];
  listing_prices_usd?: number[];
}

function parseRecEventData(root: ParentNode): EtsyRecEventData | null {
  const el =
    root.querySelector('[data-appears-event-data]') ??
    (root instanceof Element && root.hasAttribute('data-appears-event-data') ? root : null);
  if (!el) return null;
  try {
    const raw = el.getAttribute('data-appears-event-data');
    if (!raw) return null;
    return JSON.parse(raw.replace(/&quot;/g, '"')) as EtsyRecEventData;
  } catch {
    return null;
  }
}

function findSimilarRoot(doc: ParentNode = document): Element | null {
  return (
    doc.querySelector('#nlp-listing-grid-container') ??
    doc.querySelector('.similar-items') ??
    doc.querySelector('#recs_ribbon_container') ??
    doc.querySelector('[data-listing-page-lazy-loaded-bottom-section]')
  );
}

function hasSimilarSectionData(doc: ParentNode = document): boolean {
  const root = findSimilarRoot(doc) ?? doc;
  if (root.querySelector('.v2-listing-card[data-listing-id], li[data-listing-id][data-listing-id]')) {
    return true;
  }
  const eventData = parseRecEventData(root) ?? parseRecEventData(doc);
  return (eventData?.listing_ids?.length ?? 0) > 0;
}

function parseCardPrice(card: Element): { price: number; currency: string } {
  const salePriceEl = card.querySelector(
    '.n-listing-card__price .wt-text-title-01.lc-price .currency-value, .n-listing-card__price .wt-text-title-01 .currency-value, .n-listing-card__price .wt-text-slime .currency-value',
  );
  const priceText = salePriceEl?.textContent?.trim() ?? queryText(card, ['.currency-value']);
  const price = priceText ? (parseNumber(priceText) ?? 0) : 0;
  const currencySymbol =
    card.querySelector('.n-listing-card__price .currency-symbol')?.textContent?.trim() ?? priceText ?? '';
  return { price, currency: detectCurrency(currencySymbol || priceText || 'USD') };
}

function parseCardShopName(card: Element): string {
  const shopContainer = card.querySelector('[data-seller-name-container]');
  const shopHidden = shopContainer?.querySelector('span[aria-hidden="true"]')?.textContent?.trim();
  if (shopHidden && !/ad by etsy seller/i.test(shopHidden)) {
    return shopHidden;
  }

  const shopId = card.getAttribute('data-shop-id');
  return (
    queryText(card, ['p[class*="shop"], a[href*="/shop/"]', '[data-shop-name]']) ??
    (shopId ? `Shop ${shopId}` : 'Unknown shop')
  );
}

function parseCardRatingAndReviews(card: Element): { rating: number | null; reviewCount: number } {
  const ratingNumEl = card.querySelector('.larger_review_stars .wt-text-title-small');
  const ratingFromText = ratingNumEl ? parseNumber(ratingNumEl.textContent) : null;

  const ratingEl = card.querySelector('[aria-label*="star"], [data-star-rating]');
  const ratingLabel = ratingEl?.getAttribute('aria-label') ?? ratingEl?.textContent ?? '';
  const ratingMatch = ratingLabel.match(/([\d.]+)\s*(?:out of|\/)\s*5/i) ?? ratingLabel.match(/^([\d.]+)\s*star/i);
  const ratingFromAria = ratingMatch ? parseNumber(ratingMatch[1]) : parseNumber(ratingLabel);
  const rating = ratingFromText ?? ratingFromAria;

  const reviewFromAria = ratingLabel.match(/with\s+([\d,.]+[km]?)\s+reviews/i);
  const reviewText = queryText(card, [
    '[data-reviews]',
    'p.wt-text-body-smaller',
    'span[class*="review"]',
    'p[class*="review"]',
  ]);
  const reviewMatch = reviewText?.match(/\(([\d,.]+[km]?)\)/i) ?? reviewText?.match(/([\d,.]+[km]?)/i);
  const reviewCount =
    parseCompactNumber(reviewFromAria?.[1] ?? reviewMatch?.[1] ?? reviewText ?? '') ?? 0;

  return { rating, reviewCount };
}

function scrapeSimilarCard(
  card: Element,
  priceFallback: number | null,
): ListingData | null {
  const listingId =
    card.getAttribute('data-listing-id') ??
    (() => {
      const link = card.querySelector<HTMLAnchorElement>('a[href*="/listing/"]');
      return link ? extractListingId(link.href) : null;
    })();

  if (!listingId) return null;

  const link = card.querySelector<HTMLAnchorElement>('a[href*="/listing/"]');
  const url = link?.href.split('?')[0] ?? `https://www.etsy.com/listing/${listingId}`;

  const title =
    queryText(card, ['h3', '[data-listing-card-title]', '.v2-listing-card__title']) ??
    link?.getAttribute('title') ??
    link?.getAttribute('aria-label') ??
    'Untitled listing';

  const { price, currency } = parseCardPrice(card);
  const resolvedPrice = price > 0 ? price : (priceFallback ?? 0);
  const { rating, reviewCount } = parseCardRatingAndReviews(card);

  const imageEl = card.querySelector<HTMLImageElement>('img[src*="etsystatic"], img');

  return {
    listingId,
    title,
    url,
    imageUrl: imageEl?.src ?? null,
    images: imageEl?.src ? [imageEl.src] : [],
    price: resolvedPrice,
    currency,
    reviewCount,
    rating,
    favorites: null,
    shopName: parseCardShopName(card),
    category: null,
    tags: [],
    listingAgeDays: null,
    latestReviewDate: null,
    reviewsLast30Days: null,
    reviewsLast90Days: null,
    bestseller: false,
    etsyPick: false,
    scrapedAt: Date.now(),
  };
}

function buildListingFromEventData(
  listingId: string,
  index: number,
  eventData: EtsyRecEventData,
  maxScore: number,
): CompetitorMatch {
  const etsyScore = eventData.scores?.[index] ?? null;
  const price = eventData.listing_prices_usd?.[index] ?? 0;
  const similarity =
    etsyScore != null && maxScore > 0
      ? Math.min(100, Math.round((etsyScore / maxScore) * 100))
      : Math.max(10, 100 - index * 4);

  return {
    listing: {
      listingId,
      title: `Listing ${listingId}`,
      url: `https://www.etsy.com/listing/${listingId}`,
      imageUrl: null,
      images: [],
      price,
      currency: 'USD',
      reviewCount: 0,
      rating: null,
      favorites: null,
      shopName: 'Unknown shop',
      category: null,
      tags: [],
      listingAgeDays: null,
      latestReviewDate: null,
      reviewsLast30Days: null,
      reviewsLast90Days: null,
      bestseller: false,
      etsyPick: false,
      scrapedAt: Date.now(),
    },
    similarity,
    estimate: {
      totalSales: 0,
      monthlySales: 0,
      monthlyRevenue: 0,
      annualRevenue: 0,
      confidence: 'low',
      factors: [],
    },
    etsyScore,
  };
}

function buildCompetitorMatch(
  listing: ListingData,
  index: number,
  etsyScore: number | null,
  maxScore: number,
): CompetitorMatch {
  const similarity =
    etsyScore != null && maxScore > 0
      ? Math.min(100, Math.round((etsyScore / maxScore) * 100))
      : Math.max(10, 100 - index * 4);

  return {
    listing,
    similarity,
    estimate: {
      totalSales: 0,
      monthlySales: 0,
      monthlyRevenue: 0,
      annualRevenue: 0,
      confidence: 'low',
      factors: [],
    },
    etsyScore,
  };
}

function collectSimilarListingsFromDocument(
  doc: ParentNode,
  currentListingId?: string | null,
): CompetitorMatch[] {
  const currentId = currentListingId ?? extractListingId(window.location.href);
  const root = findSimilarRoot(doc) ?? doc;
  const eventData = parseRecEventData(root) ?? parseRecEventData(doc);

  const scoreMap = new Map<string, number>();
  const priceMap = new Map<string, number>();
  let maxScore = 0;

  if (eventData?.listing_ids) {
    eventData.listing_ids.forEach((id, i) => {
      const key = String(id);
      const score = eventData.scores?.[i];
      if (score != null) {
        scoreMap.set(key, score);
        maxScore = Math.max(maxScore, score);
      }
      const price = eventData.listing_prices_usd?.[i];
      if (price != null) priceMap.set(key, price);
    });
  }

  const cards = root.querySelectorAll(
    '.v2-listing-card[data-listing-id], li[data-listing-id].v2-listing-card, .similar-items [data-listing-id], div[data-listing-id].v2-listing-card, #nlp-listing-grid-container [data-listing-id]',
  );

  const seen = new Set<string>();
  const competitors: CompetitorMatch[] = [];

  cards.forEach((card) => {
    const listingId = card.getAttribute('data-listing-id');
    if (!listingId || seen.has(listingId) || listingId === currentId) return;

    const listing = scrapeSimilarCard(card, priceMap.get(listingId) ?? null);
    if (!listing) return;

    seen.add(listingId);
    competitors.push(
      buildCompetitorMatch(listing, competitors.length, scoreMap.get(listingId) ?? null, maxScore),
    );
  });

  if (competitors.length === 0 && eventData?.listing_ids?.length) {
    eventData.listing_ids.forEach((id, index) => {
      const listingId = String(id);
      if (listingId === currentId || seen.has(listingId)) return;
      seen.add(listingId);
      competitors.push(buildListingFromEventData(listingId, index, eventData, maxScore));
    });
  }

  return competitors;
}

export function parseSimilarListingsHtml(
  html: string,
  currentListingId?: string | null,
): CompetitorMatch[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return collectSimilarListingsFromDocument(doc, currentListingId);
}

export function collectSimilarListings(currentListingId?: string | null): CompetitorMatch[] {
  return collectSimilarListingsFromDocument(document, currentListingId);
}

async function requestSimilarHtml(url: string): Promise<string | null> {
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

function requestSimilarHtmlInPageContext(url: string): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const eventId = `etsy-research-similar-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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

/**
 * Fetch similar listings from Etsy's dedicated endpoint, which includes
 * prices and ratings that are often missing from the inline listing-page section.
 */
export async function fetchSimilarListingsFromEndpoint(
  listingId: string,
): Promise<CompetitorMatch[]> {
  const url = `https://www.etsy.com/r/similar/${encodeURIComponent(listingId)}`;

  const html = (await requestSimilarHtml(url)) ?? (await requestSimilarHtmlInPageContext(url));
  if (!html) return [];

  return parseSimilarListingsHtml(html, listingId);
}

export async function fetchSimilarListings(
  listingId?: string | null,
): Promise<CompetitorMatch[]> {
  const currentId = listingId ?? extractListingId(window.location.href);
  if (!currentId) return [];

  const fromEndpoint = await fetchSimilarListingsFromEndpoint(currentId);
  if (fromEndpoint.length > 0) return fromEndpoint;

  await waitForSimilarListings(4000);
  return collectSimilarListings(currentId);
}

export function scrollSimilarSectionIntoView(): void {
  const target =
    document.querySelector('[data-listing-page-lazy-loaded-bottom-section]') ??
    document.querySelector('#recs_ribbon_container') ??
    document.querySelector('.similar-items');

  if (target) {
    target.scrollIntoView({ behavior: 'auto', block: 'center' });
    return;
  }

  window.scrollTo({ top: document.body.scrollHeight, behavior: 'auto' });
}

export function waitForSimilarListings(timeoutMs = 8000): Promise<void> {
  scrollSimilarSectionIntoView();

  if (hasSimilarSectionData()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const retryScroll = window.setTimeout(() => scrollSimilarSectionIntoView(), 600);

    const observer = new MutationObserver(() => {
      if (hasSimilarSectionData()) {
        window.clearTimeout(retryScroll);
        observer.disconnect();
        resolve();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      window.clearTimeout(retryScroll);
      observer.disconnect();
      resolve();
    }, timeoutMs);
  });
}
