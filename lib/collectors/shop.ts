import type { ShopData } from '../types/shop';
import { fetchShopPage } from './shop-page';
import {
  extractShopUsername,
  parseAgeToDays,
  parseCompactNumber,
  parseNumber,
  queryText,
} from './utils';

async function enrichShopWithPageData(shop: ShopData): Promise<ShopData> {
  if (!shop.shopUsername) return shop;

  const shopPage = await fetchShopPage(shop.shopUsername);
  if (!shopPage) return shop;

  return {
    ...shop,
    averageRating: shopPage.averageRating ?? shop.averageRating,
    totalReviews: shopPage.totalReviews ?? shop.totalReviews,
    totalSales: shopPage.totalSales ?? shop.totalSales,
    shopAgeDays: shopPage.shopAgeDays ?? shop.shopAgeDays,
    activeListings: shopPage.activeListings ?? shop.activeListings,
    topListings: shopPage.topListings.length > 0 ? shopPage.topListings : shop.topListings,
  };
}

export { enrichShopWithPageData };

function parseShopReviewsCount(): number | null {
  const el = document.querySelector('[data-shop-reviews-count]');
  if (el) {
    const attr = el.getAttribute('data-shop-reviews-count');
    if (attr) return parseNumber(attr);
  }

  const reviewText = queryText(document, [
    '[data-appears-component-name="shop_owners"] .rating-and-reviews-count',
    '.rating-and-reviews-count',
  ]);
  if (reviewText) {
    const parenMatch = reviewText.match(/\(([\d.]+[km]?)\)/i);
    if (parenMatch) return parseCompactNumber(parenMatch[1]);
    const numMatch = reviewText.match(/([\d,.]+[km]?)/i);
    if (numMatch) return parseCompactNumber(numMatch[1]);
  }

  return null;
}

export function collectShopBlock(): ShopData {
  const shopRoot =
    document.querySelector('[data-appears-component-name="shop_owners"]') ?? document;

  const shopIdEl =
    document.querySelector('#mys-shop-reviews-root[data-shop-id]') ??
    document.querySelector('[data-shop-id]');
  const shopId = shopIdEl?.getAttribute('data-shop-id') ?? null;

  const shopLink = shopRoot.querySelector<HTMLAnchorElement>('a[href*="/shop/"]');
  const shopUrl = shopLink?.href ?? '';
  const shopName =
    shopLink?.textContent?.trim() ??
    queryText(shopRoot, ['a[href*="/shop/"]', '[data-shop-name]']) ??
    'Unknown shop';

  const shopUsername = shopUrl ? extractShopUsername(shopUrl) : null;

  const ratingText = queryText(shopRoot, [
    '.rating-and-reviews-count__avg-rating',
    '[data-star-rating]',
  ]);
  const ratingMatch = ratingText?.match(/([\d.]+)/);
  const averageRating = ratingMatch ? parseNumber(ratingMatch[1]) : parseNumber(ratingText ?? '');

  const totalReviews = parseShopReviewsCount();

  const salesEl = Array.from(shopRoot.querySelectorAll('.wt-text-title, p, span')).find((el) =>
    /sales/i.test(el.textContent ?? ''),
  );
  const salesMatch = salesEl?.textContent?.match(/([\d,.]+[km]?)\s*sales/i);
  const totalSales = salesMatch ? parseCompactNumber(salesMatch[1]) : null;

  const tenureEl = document.querySelector('[data-appears-component-name="lp_seller_cred_tenure"]');
  const tenureText = tenureEl?.textContent?.trim() ?? null;
  const shopAgeDays = parseAgeToDays(tenureText);

  return {
    shopId,
    shopName,
    shopUrl,
    shopUsername,
    averageRating,
    totalReviews,
    totalSales,
    shopAgeDays,
    activeListings: null,
    topListings: [],
    scrapedAt: Date.now(),
  };
}
