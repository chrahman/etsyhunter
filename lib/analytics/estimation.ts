import type { ListingData } from '../types/listing';
import type { SalesEstimate, ConfidenceLevel } from '../types/analytics';

const REVIEW_RATE = 0.15;
const CONVERSION_FACTOR = 1 / REVIEW_RATE;

export interface EstimationInput {
  listing: ListingData;
}

export interface EstimationStrategy {
  estimate(input: EstimationInput): SalesEstimate;
}

function computeRawScore(listing: ListingData): number {
  const reviews = listing.reviewCount ?? 0;
  const r30 = listing.reviewsLast30Days ?? 0;
  const r90 = listing.reviewsLast90Days ?? 0;
  const favorites = listing.favorites ?? 0;

  return (
    reviews * 0.35 +
    r90 * 4 +
    r30 * 8 +
    favorites * 0.03 +
    (listing.bestseller ? 200 : 0) +
    (listing.etsyPick ? 100 : 0)
  );
}

function deriveConfidence(listing: ListingData): ConfidenceLevel {
  const hasReviews = listing.reviewCount > 0;
  const hasVelocity = (listing.reviewsLast30Days ?? 0) > 0 || (listing.reviewsLast90Days ?? 0) > 0;
  const hasFavorites = listing.favorites != null && listing.favorites > 0;

  if (hasReviews && hasVelocity && hasFavorites) return 'high';
  if (hasReviews && (hasVelocity || hasFavorites)) return 'medium';
  if (hasReviews) return 'medium';
  return 'low';
}

function maxMonthlyFromTotal(totalSales: number, listingAgeDays: number | null): number {
  if (totalSales <= 0) return 0;
  const ageDays = Math.max(listingAgeDays ?? 365, 30);
  return totalSales / (ageDays / 30);
}

export const defaultEstimationStrategy: EstimationStrategy = {
  estimate(input: EstimationInput): SalesEstimate {
    const { listing } = input;
    const factors: string[] = [];

    const totalSales =
      listing.reviewCount > 0 ? Math.max(1, Math.round(listing.reviewCount / REVIEW_RATE)) : 0;

    let monthlySales = 0;
    if (listing.reviewsLast30Days != null && listing.reviewsLast30Days > 0) {
      monthlySales = Math.round(listing.reviewsLast30Days * CONVERSION_FACTOR);
      factors.push('Review velocity (30d)');
    } else if (listing.reviewsLast90Days != null && listing.reviewsLast90Days > 0) {
      monthlySales = Math.round((listing.reviewsLast90Days / 3) * CONVERSION_FACTOR);
      factors.push('Review velocity (90d extrapolated)');
    } else if (listing.reviewCount > 0 && listing.listingAgeDays != null && listing.listingAgeDays > 0) {
      const dailyReviews = listing.reviewCount / listing.listingAgeDays;
      monthlySales = Math.round(dailyReviews * 30 * CONVERSION_FACTOR);
      factors.push('Review count / listing age');
    }

    if (totalSales > 0) {
      const maxMonthly = maxMonthlyFromTotal(totalSales, listing.listingAgeDays);
      if (monthlySales > maxMonthly) {
        monthlySales = Math.max(1, Math.round(maxMonthly));
      }
    }

    if (monthlySales === 0 && totalSales > 0) {
      monthlySales = Math.max(
        1,
        Math.round(maxMonthlyFromTotal(totalSales, listing.listingAgeDays)),
      );
    }

    if (listing.reviewCount === 0) {
      return {
        totalSales: 0,
        monthlySales: 0,
        monthlyRevenue: 0,
        annualRevenue: 0,
        confidence: 'low',
        factors: ['No listing reviews yet'],
      };
    }

    if (listing.reviewCount > 0) factors.push('Listing reviews');
    if (listing.favorites != null && listing.favorites > 0) factors.push('Favorites');
    if (listing.bestseller) factors.push('Bestseller badge');
    if (listing.etsyPick) factors.push("Etsy's Pick");

    const monthlyRevenue = monthlySales * listing.price;
    const annualRevenue = monthlyRevenue * 12;
    const confidence = deriveConfidence(listing);

    return {
      totalSales,
      monthlySales,
      monthlyRevenue,
      annualRevenue,
      confidence,
      factors: [...new Set(factors)],
    };
  },
};

export function estimateSales(
  listing: ListingData,
  _competitorListings: ListingData[] = [],
  strategy: EstimationStrategy = defaultEstimationStrategy,
): SalesEstimate {
  return strategy.estimate({ listing });
}

export function listingScoreToOpportunity(listing: ListingData): number {
  const raw = computeRawScore(listing);
  return Math.min(100, Math.round(raw / 2));
}

export { computeRawScore };
