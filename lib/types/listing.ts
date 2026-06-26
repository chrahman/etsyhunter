export interface ListingData {
  listingId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  images: string[];
  price: number;
  currency: string;
  reviewCount: number;
  rating: number | null;
  favorites: number | null;
  shopName: string;
  category: string | null;
  tags: string[];
  listingAgeDays: number | null;
  latestReviewDate: string | null;
  reviewsLast30Days: number | null;
  reviewsLast90Days: number | null;
  bestseller: boolean;
  etsyPick: boolean;
  scrapedAt: number;
}

export type PageType = 'listing' | 'search' | 'other';

export type ScrapeStatus = 'idle' | 'loading' | 'ready' | 'error';
