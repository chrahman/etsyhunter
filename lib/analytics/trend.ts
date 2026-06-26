import type { ListingData } from '../types/listing';
import type { TrendMetrics, TrendLabel } from '../types/analytics';
import type { ListingSnapshot } from '../types/tracking';

export function calculateTrend(
  listing: ListingData,
  snapshots: ListingSnapshot[] = [],
): TrendMetrics {
  const reviewVelocity = (listing.reviewsLast30Days ?? 0) / 30;

  let favoriteVelocity: number | null = null;
  if (snapshots.length >= 2) {
    const sorted = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const days = Math.max(
      1,
      (new Date(last.date).getTime() - new Date(first.date).getTime()) / (1000 * 60 * 60 * 24),
    );
    const favDelta = (last.favorites ?? 0) - (first.favorites ?? 0);
    favoriteVelocity = favDelta / days;
  } else if (listing.favorites != null && listing.listingAgeDays != null && listing.listingAgeDays > 0) {
    favoriteVelocity = listing.favorites / listing.listingAgeDays;
  }

  const recentActivityBoost =
    (listing.reviewsLast30Days ?? 0) > 5 ? 2 : (listing.reviewsLast30Days ?? 0) > 0 ? 1 : 0;

  const momentumScore =
    reviewVelocity + (favoriteVelocity ?? 0) * 0.1 + recentActivityBoost;

  const label = trendLabel(momentumScore, reviewVelocity);

  return {
    reviewVelocity,
    favoriteVelocity,
    momentumScore,
    label,
  };
}

function trendLabel(momentumScore: number, reviewVelocity: number): TrendLabel {
  if (reviewVelocity < 0.05 && momentumScore < 0.5) return 'Declining';
  if (momentumScore >= 3) return 'Strong Growth';
  if (momentumScore >= 1) return 'Moderate Growth';
  return 'Slow Growth';
}
