import type { ListingData } from '../types/listing';
import {
  detectCurrency,
  extractListingId,
  isListingPage,
  parseAgeToDays,
  parseCompactNumber,
  parseJsonLdScripts,
  parseNumber,
  queryText,
} from './utils';

interface ReviewSample {
  datePublished: string;
}

function parseTagsFromNeuSpec(): string[] {
  const scripts = document.querySelectorAll('script[data-neu-spec-placeholder-data]');
  for (const script of scripts) {
    try {
      const data = JSON.parse(script.textContent ?? '');
      const queries = data?.args?.click_queries;
      if (Array.isArray(queries)) {
        return queries.filter((q): q is string => typeof q === 'string').slice(0, 20);
      }
    } catch {
      // continue
    }
  }
  return [];
}

function parseReviewsFromJsonLd(items: unknown[]): {
  latestReviewDate: string | null;
  reviewsLast30Days: number | null;
  reviewsLast90Days: number | null;
} {
  let latestReviewDate: string | null = null;
  const reviewDates: Date[] = [];

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (obj['@type'] !== 'Product') continue;

    const reviews = obj.review;
    const reviewList = Array.isArray(reviews) ? reviews : reviews ? [reviews] : [];
    for (const r of reviewList) {
      if (typeof r !== 'object' || r === null) continue;
      const rev = r as ReviewSample;
      if (rev.datePublished) {
        const d = new Date(rev.datePublished);
        if (!Number.isNaN(d.getTime())) reviewDates.push(d);
      }
    }
  }

  if (reviewDates.length > 0) {
    reviewDates.sort((a, b) => b.getTime() - a.getTime());
    latestReviewDate = reviewDates[0].toISOString().split('T')[0];
  }

  const now = Date.now();
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const last30 = reviewDates.filter((d) => now - d.getTime() <= ms30).length;
  const last90 = reviewDates.filter((d) => now - d.getTime() <= ms90).length;

  return {
    latestReviewDate,
    reviewsLast30Days: reviewDates.length > 0 ? last30 : null,
    reviewsLast90Days: reviewDates.length > 0 ? last90 : null,
  };
}

function parseProductJsonLd(items: unknown[]): Partial<ListingData> {
  const partial: Partial<ListingData> = { images: [] };

  for (const item of items) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    if (obj['@type'] !== 'Product') continue;

    partial.title = String(obj.name ?? partial.title ?? '');
    const images = obj.image;
    if (Array.isArray(images)) {
      partial.images = images.map(String);
      partial.imageUrl = partial.images[0] ?? null;
    } else if (typeof images === 'string') {
      partial.images = [images];
      partial.imageUrl = images;
    }

    const offer = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    if (offer && typeof offer === 'object') {
      const o = offer as Record<string, unknown>;
      partial.price = parseNumber(String(o.price)) ?? partial.price;
      partial.currency = String(o.priceCurrency ?? partial.currency ?? 'USD');
    }

    const brand = obj.brand as Record<string, unknown> | undefined;
    if (brand?.name) partial.shopName = String(brand.name);

    if (obj.sku) partial.listingId = String(obj.sku);

    const category = obj.category;
    if (typeof category === 'string') partial.category = category;
  }

  return partial;
}

function isInsideShopBlock(el: Element): boolean {
  return !!el.closest('[data-appears-component-name="shop_owners"]');
}

function findListingReviewRoot(): Element | null {
  const buyBox = document.querySelector(
    '[data-buy-box-region], [data-buy-box], [data-listing-page-buy-box]',
  );
  if (buyBox) return buyBox;

  const itemTriage = document.querySelector('[data-tooltip-context="item_triage"]');
  if (itemTriage && !isInsideShopBlock(itemTriage)) {
    return itemTriage.closest('.reviews-rating') ?? itemTriage.parentElement;
  }

  const itemAverage = Array.from(
    document.querySelectorAll('.rating-calculation-tooltip, [data-rating-calculation-tooltip]'),
  ).find(
    (el) =>
      !isInsideShopBlock(el) &&
      (el.getAttribute('data-tooltip-context') === 'item_triage' ||
        /item average/i.test(el.textContent ?? '')),
  );

  if (itemAverage) {
    return itemAverage.closest('.reviews-rating') ?? itemAverage.parentElement;
  }

  return null;
}

function parseReviewsFromRoot(root: Element): { reviewCount: number; rating: number | null } | null {
  const itemAverageEl = Array.from(
    root.querySelectorAll(
      '.rating-calculation-tooltip button, button.wt-tooltip__trigger, [data-rating-calculation-tooltip] button, [data-rating-calculation-tooltip]',
    ),
  ).find(
    (el) =>
      el.getAttribute('data-tooltip-context') === 'item_triage' ||
      /item average/i.test(el.textContent ?? ''),
  );

  const reviewsBlock =
    (itemAverageEl?.closest('.reviews-rating') ?? null) ??
    root.querySelector('.reviews-rating');

  if (!reviewsBlock) return null;

  const ratingEl = reviewsBlock.querySelector('span.reviews-rating');
  const rating = ratingEl ? parseNumber(ratingEl.textContent?.trim() ?? '') : null;

  for (const p of reviewsBlock.querySelectorAll('.wt-text-body-smaller, p')) {
    const text = p.textContent ?? '';
    const match = text.match(/\(([\d,.]+[km]?)\s*reviews?\)/i);
    if (match) {
      const count = parseCompactNumber(match[1]) ?? 0;
      return { reviewCount: count, rating: count > 0 ? rating : null };
    }
  }

  if (itemAverageEl) {
    return { reviewCount: 0, rating: null };
  }

  return null;
}

function scrapeListingReviewsFromDom(): {
  reviewCount: number;
  rating: number | null;
} {
  const root = findListingReviewRoot();

  if (root) {
    const parsed = parseReviewsFromRoot(root);
    if (parsed) return parsed;

    const rootText = root.textContent ?? '';
    if (/no reviews yet|be the first|0 reviews/i.test(rootText)) {
      return { reviewCount: 0, rating: null };
    }
  }

  const itemTriageEl = document.querySelector('[data-tooltip-context="item_triage"]');
  if (itemTriageEl && !isInsideShopBlock(itemTriageEl)) {
    const block =
      itemTriageEl.closest('.reviews-rating') ??
      itemTriageEl.parentElement?.parentElement ??
      itemTriageEl.parentElement;
    if (block) {
      const parsed = parseReviewsFromRoot(block);
      if (parsed) return parsed;
    }
    return { reviewCount: 0, rating: null };
  }

  return { reviewCount: 0, rating: null };
}

function capVelocity(value: number | null, reviewCount: number): number | null {
  if (value == null) return null;
  if (reviewCount <= 0) return 0;
  return Math.min(value, reviewCount);
}

function scrapeListingDom(): Partial<ListingData> {
  const partial: Partial<ListingData> = { images: [] };

  partial.title =
    queryText(document, [
      'h1[data-buy-box-listing-title]',
      'h1[data-listing-id]',
      '[data-listing-page-title] h1',
      'h1',
    ]) ?? partial.title;

  const priceText = queryText(document, [
    '[data-buy-box-region] [data-selector="price"]',
    '[data-buy-box-region] p[class*="price"]',
    '[data-selector="price"]',
    '.wt-text-title-larger',
  ]);
  if (priceText) {
    partial.price = parseNumber(priceText) ?? partial.price;
    partial.currency = detectCurrency(priceText);
  }

  const favoritesLink = document.querySelector('a[href*="/favoriters"]');
  if (favoritesLink) {
    const favText = favoritesLink.textContent ?? '';
    const favMatch = favText.match(/([\d,.]+[km]?)/i);
    partial.favorites = parseCompactNumber(favMatch?.[1] ?? favText);
  }

  const listedText = queryText(document, [
    '[data-listing-age]',
    '.listing-age',
  ]) ?? Array.from(document.querySelectorAll('p, span, div'))
    .map((el) => el.textContent?.trim() ?? '')
    .find((t) => /listed on/i.test(t));

  partial.listingAgeDays = parseAgeToDays(listedText ?? null);

  partial.bestseller =
    document.querySelector('#bestseller') != null ||
    document.querySelector('clg-icon[name="bestseller"]') != null;

  partial.etsyPick = document.querySelector('#etsys_pick') != null;

  const imageEls = document.querySelectorAll<HTMLImageElement>(
    '[data-carousel-first-image] img, [data-listing-page-image] img, img[src*="etsystatic"]',
  );
  const images = new Set<string>();
  imageEls.forEach((img) => {
    if (img.src) images.add(img.src);
  });
  if (images.size > 0) {
    partial.images = Array.from(images);
    partial.imageUrl = partial.images[0];
  }

  return partial;
}

export function collectListing(url: string = window.location.href): ListingData | null {
  if (!isListingPage(url)) return null;

  const listingId = extractListingId(url);
  if (!listingId) return null;

  const jsonLdItems = parseJsonLdScripts();
  const jsonLdProduct = parseProductJsonLd(jsonLdItems);
  const reviewData = parseReviewsFromJsonLd(jsonLdItems);
  const domReviews = scrapeListingReviewsFromDom();
  const dom = scrapeListingDom();
  const tags = parseTagsFromNeuSpec();

  const reviewCount = domReviews.reviewCount;
  const rating = reviewCount > 0 ? domReviews.rating : null;

  const scrapedAt = Date.now();

  return {
    listingId: jsonLdProduct.listingId ?? listingId,
    title: dom.title ?? jsonLdProduct.title ?? 'Untitled listing',
    url,
    imageUrl: dom.imageUrl ?? jsonLdProduct.imageUrl ?? null,
    images: dom.images?.length ? dom.images : jsonLdProduct.images ?? [],
    price: dom.price ?? jsonLdProduct.price ?? 0,
    currency: dom.currency ?? jsonLdProduct.currency ?? 'USD',
    reviewCount,
    rating,
    favorites: dom.favorites ?? null,
    shopName: jsonLdProduct.shopName ?? 'Unknown shop',
    category: jsonLdProduct.category ?? null,
    tags: tags.length > 0 ? tags : [],
    listingAgeDays: dom.listingAgeDays ?? null,
    latestReviewDate: reviewCount > 0 ? reviewData.latestReviewDate : null,
    reviewsLast30Days: reviewCount > 0 ? capVelocity(reviewData.reviewsLast30Days, reviewCount) : null,
    reviewsLast90Days: reviewCount > 0 ? capVelocity(reviewData.reviewsLast90Days, reviewCount) : null,
    bestseller: dom.bestseller ?? false,
    etsyPick: dom.etsyPick ?? false,
    scrapedAt,
  };
}
