export interface ListingSnapshot {
  date: string;
  reviewCount: number;
  favorites: number | null;
  price: number;
}

export interface TrackedListing {
  listingId: string;
  title: string;
  url: string;
  imageUrl: string | null;
  shopName: string;
  startedAt: number;
  snapshots: ListingSnapshot[];
}
