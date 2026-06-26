import type { ListingData } from './listing';

export type ConfidenceLevel = 'low' | 'medium' | 'high';

export type DemandLevel = 'Low' | 'Medium' | 'High';
export type CompetitionLevel = 'Low' | 'Medium' | 'High';
export type MaturityLevel = 'Emerging' | 'Growing' | 'Saturated';
export type TrendLabel = 'Strong Growth' | 'Moderate Growth' | 'Slow Growth' | 'Declining';

export interface SalesEstimate {
  totalSales: number;
  monthlySales: number;
  monthlyRevenue: number;
  annualRevenue: number;
  confidence: ConfidenceLevel;
  factors: string[];
}

export interface TrendMetrics {
  reviewVelocity: number;
  favoriteVelocity: number | null;
  momentumScore: number;
  label: TrendLabel;
}

export interface MarketAverages {
  price: number;
  reviews: number;
  favorites: number;
  rating: number | null;
}

export interface MarketAnalysis {
  demand: DemandLevel;
  competition: CompetitionLevel;
  maturity: MaturityLevel;
  averages: MarketAverages;
  topCompetitors: ListingData[];
  marketOpportunityScore: number;
  summary: string;
}

export interface CompetitorMatch {
  listing: ListingData;
  similarity: number;
  estimate: SalesEstimate;
  etsyScore: number | null;
}

export type CompetitorSortKey =
  | 'similarity'
  | 'estimatedSales'
  | 'revenue'
  | 'reviews'
  | 'favorites';
