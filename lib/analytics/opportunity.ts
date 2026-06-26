import type { ListingData } from '../types/listing';
import type { TrendMetrics } from '../types/analytics';

export function calculateOpportunityScore(
  listing: ListingData,
  trend: TrendMetrics,
  competitorCount: number,
): number {
  let score = 0;

  const reviewVelocity = trend.reviewVelocity;
  score += Math.min(30, reviewVelocity * 10);

  const competitionPenalty = Math.min(25, competitorCount * 2);
  score += Math.max(0, 25 - competitionPenalty);

  if (listing.favorites != null && listing.favorites > 50) {
    score += Math.min(15, Math.log10(listing.favorites) * 5);
  }

  if (listing.listingAgeDays != null) {
    if (listing.listingAgeDays >= 90 && listing.listingAgeDays <= 730) {
      score += 15;
    } else if (listing.listingAgeDays < 90) {
      score += 8;
    } else {
      score += 5;
    }
  }

  if (listing.bestseller) score += 10;
  if (listing.etsyPick) score += 10;

  if (listing.rating != null && listing.rating >= 4.5) score += 5;

  return Math.min(100, Math.round(score));
}

export function opportunityColor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 70) return 'green';
  if (score >= 40) return 'yellow';
  return 'red';
}

export function opportunityLabel(score: number): string {
  if (score >= 70) return 'Strong Opportunity';
  if (score >= 40) return 'Moderate Opportunity';
  return 'Low Opportunity';
}
