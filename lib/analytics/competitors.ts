import type { ListingData } from '../types/listing';
import type { CompetitorMatch } from '../types/analytics';

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union > 0 ? intersection / union : 0;
}

function tagOverlap(tagsA: string[], tagsB: string[]): number {
  if (tagsA.length === 0 || tagsB.length === 0) return 0;
  const setA = new Set(tagsA.map((t) => t.toLowerCase()));
  const setB = new Set(tagsB.map((t) => t.toLowerCase()));
  return jaccard(setA, setB);
}

function priceProximity(priceA: number, priceB: number): number {
  if (priceA <= 0 || priceB <= 0) return 0;
  const ratio = Math.min(priceA, priceB) / Math.max(priceA, priceB);
  return ratio;
}

export function computeSimilarity(
  target: ListingData,
  candidate: ListingData,
  etsyScore: number | null,
): number {
  const etsyComponent = etsyScore != null ? Math.min(1, etsyScore) * 40 : 0;

  const titleTokens = tokenize(target.title);
  const candidateTokens = tokenize(candidate.title);
  const titleJaccard = jaccard(titleTokens, candidateTokens) * 25;

  const tagScore = tagOverlap(target.tags, candidate.tags) * 20;

  const categoryMatch =
    target.category && candidate.category && target.category === candidate.category ? 10 : 0;

  const priceScore = priceProximity(target.price, candidate.price) * 5;

  const total = etsyComponent + titleJaccard + tagScore + categoryMatch + priceScore;

  if (etsyScore == null && total === 0) {
    return Math.round(jaccard(titleTokens, candidateTokens) * 100);
  }

  return Math.min(100, Math.round(total));
}

export function enrichCompetitors(
  target: ListingData,
  competitors: CompetitorMatch[],
): CompetitorMatch[] {
  return competitors
    .filter((c) => c.listing.listingId !== target.listingId)
    .map((c) => ({
      ...c,
      similarity: computeSimilarity(target, c.listing, c.etsyScore),
    }))
    .sort((a, b) => b.similarity - a.similarity);
}

export function sortCompetitors(
  competitors: CompetitorMatch[],
  sortKey: 'similarity' | 'estimatedSales' | 'revenue' | 'reviews' | 'favorites',
): CompetitorMatch[] {
  return [...competitors].sort((a, b) => {
    switch (sortKey) {
      case 'similarity':
        return b.similarity - a.similarity;
      case 'estimatedSales':
        return b.estimate.totalSales - a.estimate.totalSales;
      case 'revenue':
        return b.estimate.monthlyRevenue - a.estimate.monthlyRevenue;
      case 'reviews':
        return b.listing.reviewCount - a.listing.reviewCount;
      case 'favorites':
        return (b.listing.favorites ?? 0) - (a.listing.favorites ?? 0);
      default:
        return 0;
    }
  });
}
