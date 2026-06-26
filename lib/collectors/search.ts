import type { ListingData } from '../types/listing';
import type { CompetitorMatch } from '../types/analytics';
import {
  detectCurrency,
  extractListingId,
  parseCompactNumber,
  parseNumber,
  queryText,
} from './utils';

function scrapeSearchCard(card: Element, link: HTMLAnchorElement): ListingData | null {
  const listingId = extractListingId(link.href);
  if (!listingId) return null;

  const title =
    queryText(card, [
      'h3',
      '[data-listing-card-title]',
      '.v2-listing-card__title',
      '.wt-text-caption',
    ]) ??
    link.getAttribute('aria-label') ??
    'Untitled listing';

  const priceText = queryText(card, [
    '[data-search-price]',
    '.currency-value',
    'span[class*="currency"]',
    '.lc-price',
    '.n-listing-card__price',
  ]);

  const ratingEl = card.querySelector('[aria-label*="star"], [data-star-rating]');
  const ratingLabel = ratingEl?.getAttribute('aria-label') ?? ratingEl?.textContent ?? '';
  const ratingMatch = ratingLabel.match(/([\d.]+)\s*(?:out of|\/)\s*5/i);
  const rating = ratingMatch ? parseNumber(ratingMatch[1]) : parseNumber(ratingLabel);

  const reviewText = queryText(card, ['[data-reviews]', 'span[class*="review"]', '.wt-text-caption']);
  const reviewMatch = reviewText?.match(/([\d,.]+[km]?)/i);
  const reviewCount = parseCompactNumber(reviewMatch?.[1] ?? reviewText ?? '') ?? 0;

  const imageEl = card.querySelector<HTMLImageElement>(
    'img[src*="etsystatic"], img[data-listing-card-listing-image], img',
  );

  const shopName =
    queryText(card, ['p[class*="shop"], a[href*="/shop/"]', '[data-shop-name]']) ?? 'Unknown shop';

  return {
    listingId,
    title,
    url: link.href.split('?')[0],
    imageUrl: imageEl?.src ?? null,
    images: imageEl?.src ? [imageEl.src] : [],
    price: priceText ? (parseNumber(priceText) ?? 0) : 0,
    currency: priceText ? detectCurrency(priceText) : 'USD',
    reviewCount,
    rating,
    favorites: null,
    shopName,
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

export function collectSearchResults(): CompetitorMatch[] {
  const seen = new Set<string>();
  const results: CompetitorMatch[] = [];

  const cardSelectors = [
    '[data-listing-id]',
    'li.wt-list-unstyled',
    '.v2-listing-card',
    '[data-search-results] li',
    '.wt-block-grid__item',
  ];

  for (const selector of cardSelectors) {
    document.querySelectorAll(selector).forEach((card) => {
      const link = card.querySelector<HTMLAnchorElement>('a[href*="/listing/"]');
      if (!link) return;

      const listingId = extractListingId(link.href);
      if (!listingId || seen.has(listingId)) return;

      const listing = scrapeSearchCard(card, link);
      if (!listing) return;

      seen.add(listingId);
      results.push({
        listing,
        similarity: 0,
        estimate: {
          totalSales: 0,
          monthlySales: 0,
          monthlyRevenue: 0,
          annualRevenue: 0,
          confidence: 'low',
          factors: [],
        },
        etsyScore: null,
      });
    });

    if (results.length > 0) break;
  }

  if (results.length === 0) {
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/listing/"]').forEach((link) => {
      const listingId = extractListingId(link.href);
      if (!listingId || seen.has(listingId)) return;

      const card = link.closest('li, div[class*="listing"], article') ?? link.parentElement;
      if (!card) return;

      const listing = scrapeSearchCard(card, link);
      if (!listing) return;

      seen.add(listingId);
      results.push({
        listing,
        similarity: 0,
        estimate: {
          totalSales: 0,
          monthlySales: 0,
          monthlyRevenue: 0,
          annualRevenue: 0,
          confidence: 'low',
          factors: [],
        },
        etsyScore: null,
      });
    });
  }

  return results;
}

export function listingToCompetitor(listing: ListingData): CompetitorMatch {
  return {
    listing,
    similarity: 100,
    estimate: {
      totalSales: 0,
      monthlySales: 0,
      monthlyRevenue: 0,
      annualRevenue: 0,
      confidence: 'low',
      factors: [],
    },
    etsyScore: null,
  };
}
