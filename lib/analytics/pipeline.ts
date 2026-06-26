import type { ResearchReport } from '../types/research';
import type { ListingData } from '../types/listing';
import type { ShopData } from '../types/shop';
import type { CompetitorMatch } from '../types/analytics';
import type { PageType } from '../types/listing';
import { estimateSales, listingScoreToOpportunity } from './estimation';
import { calculateTrend } from './trend';
import { analyzeMarket } from './market';
import { enrichCompetitors } from './competitors';

export interface PipelineInput {
  pageType: PageType;
  query: string | null;
  listing: ListingData | null;
  shop: ShopData | null;
  competitors: CompetitorMatch[];
}

export function buildResearchReport(input: PipelineInput): ResearchReport {
  const { pageType, query, listing, shop, competitors: rawCompetitors } = input;
  const scrapedAt = Date.now();

  if (!listing) {
    const competitorListings = rawCompetitors.map((c) => c.listing);
    const market = analyzeMarket(competitorListings);
    const enriched = rawCompetitors.map((c) => ({
      ...c,
      estimate: estimateSales(c.listing, competitorListings),
    }));

    return {
      pageType,
      query,
      listing: null,
      shop: null,
      estimate: null,
      trend: null,
      opportunityScore: market.marketOpportunityScore,
      competitors: enriched,
      market,
      scrapedAt,
    };
  }

  const competitorListings = rawCompetitors.map((c) => c.listing);
  const enrichedCompetitors = enrichCompetitors(listing, rawCompetitors).map((c) => ({
    ...c,
    estimate: estimateSales(c.listing, [listing, ...competitorListings]),
  }));

  const estimate = estimateSales(listing, [listing, ...competitorListings]);

  const trend = calculateTrend(listing);
  const opportunityScore = listingScoreToOpportunity(listing);

  const allForMarket = [listing, ...competitorListings.filter((c) => c.listingId !== listing.listingId)];
  const market = analyzeMarket(allForMarket);

  return {
    pageType,
    query,
    listing,
    shop,
    estimate,
    trend,
    opportunityScore,
    competitors: enrichedCompetitors,
    market,
    scrapedAt,
  };
}
