import type { ListingData } from '../types/listing';
import type { MarketAnalysis, DemandLevel, CompetitionLevel, MaturityLevel } from '../types/analytics';

export function analyzeMarket(competitors: ListingData[]): MarketAnalysis {
  if (competitors.length === 0) {
    return {
      demand: 'Low',
      competition: 'Low',
      maturity: 'Emerging',
      averages: { price: 0, reviews: 0, favorites: 0, rating: null },
      topCompetitors: [],
      marketOpportunityScore: 50,
      summary: 'Insufficient competitor data for market analysis.',
    };
  }

  const prices = competitors.map((c) => c.price);
  const reviews = competitors.map((c) => c.reviewCount);
  const favorites = competitors.map((c) => c.favorites ?? 0);
  const ratings = competitors.map((c) => c.rating).filter((r): r is number => r != null);

  const avgPrice = average(prices);
  const avgReviews = average(reviews);
  const avgFavorites = average(favorites);
  const avgRating = ratings.length > 0 ? average(ratings) : null;

  const avgReviewVelocity =
    average(competitors.map((c) => (c.reviewsLast30Days ?? 0) / 30));

  const demand = demandLevel(avgReviewVelocity, avgFavorites);
  const competition = competitionLevel(competitors.length, avgReviews);
  const maturity = maturityLevel(competitors);

  const marketOpportunityScore = computeMarketOpportunity(demand, competition, maturity);

  const topCompetitors = [...competitors]
    .sort((a, b) => b.reviewCount - a.reviewCount)
    .slice(0, 10);

  const summary = buildSummary(demand, competition, maturity, avgPrice, competitors.length);

  return {
    demand,
    competition,
    maturity,
    averages: {
      price: avgPrice,
      reviews: Math.round(avgReviews),
      favorites: Math.round(avgFavorites),
      rating: avgRating != null ? Math.round(avgRating * 10) / 10 : null,
    },
    topCompetitors,
    marketOpportunityScore,
    summary,
  };
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function demandLevel(avgReviewVelocity: number, avgFavorites: number): DemandLevel {
  const demandScore = avgReviewVelocity * 10 + avgFavorites * 0.01;
  if (demandScore >= 5) return 'High';
  if (demandScore >= 1) return 'Medium';
  return 'Low';
}

function competitionLevel(count: number, avgReviews: number): CompetitionLevel {
  const compScore = count * 0.5 + avgReviews * 0.01;
  if (compScore >= 15) return 'High';
  if (compScore >= 5) return 'Medium';
  return 'Low';
}

function maturityLevel(competitors: ListingData[]): MaturityLevel {
  const ages = competitors
    .map((c) => c.listingAgeDays)
    .filter((a): a is number => a != null);
  const avgAge = ages.length > 0 ? average(ages) : 365;
  const avgReviews = average(competitors.map((c) => c.reviewCount));

  if (avgAge < 180 && avgReviews < 100) return 'Emerging';
  if (avgAge < 730 && avgReviews < 500) return 'Growing';
  return 'Saturated';
}

function computeMarketOpportunity(
  demand: DemandLevel,
  competition: CompetitionLevel,
  maturity: MaturityLevel,
): number {
  const demandScore = { Low: 20, Medium: 50, High: 80 }[demand];
  const compScore = { Low: 80, Medium: 50, High: 20 }[competition];
  const matScore = { Emerging: 70, Growing: 60, Saturated: 30 }[maturity];
  return Math.round((demandScore + compScore + matScore) / 3);
}

function buildSummary(
  demand: DemandLevel,
  competition: CompetitionLevel,
  maturity: MaturityLevel,
  avgPrice: number,
  count: number,
): string {
  return (
    `Market shows ${demand.toLowerCase()} demand with ${competition.toLowerCase()} competition ` +
    `in a ${maturity.toLowerCase()} niche. Analyzed ${count} competitors with avg. price ` +
    `$${avgPrice.toFixed(2)}.`
  );
}
