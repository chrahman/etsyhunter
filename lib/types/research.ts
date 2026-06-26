import type { SalesEstimate, TrendMetrics, MarketAnalysis, CompetitorMatch } from './analytics';
import type { ListingData, PageType } from './listing';
import type { ShopData } from './shop';

export interface ResearchReport {
  pageType: PageType;
  query: string | null;
  listing: ListingData | null;
  shop: ShopData | null;
  estimate: SalesEstimate | null;
  trend: TrendMetrics | null;
  opportunityScore: number;
  competitors: CompetitorMatch[];
  market: MarketAnalysis | null;
  scrapedAt: number;
}

export interface CollectedListingData {
  listing: ListingData;
  shop: ShopData;
  competitors: CompetitorMatch[];
  pageType: PageType;
  query: string | null;
}
