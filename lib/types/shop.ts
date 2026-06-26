export interface ShopListing {
  listingId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  price: number;
  currency: string;
}

export interface ShopData {
  shopId: string | null;
  shopName: string;
  shopUrl: string;
  shopUsername: string | null;
  averageRating: number | null;
  totalReviews: number | null;
  totalSales: number | null;
  shopAgeDays: number | null;
  activeListings: number | null;
  topListings: ShopListing[];
  scrapedAt: number;
}
