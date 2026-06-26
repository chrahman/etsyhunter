import type { ListingData } from '../types/listing';
import type { TrackedListing, ListingSnapshot } from '../types/tracking';

const STORAGE_KEY = 'trackedListings';
export const TRACKING_ALARM = 'daily-tracking-snapshot';

export async function getTrackedListings(): Promise<TrackedListing[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const items = result[STORAGE_KEY];
  return Array.isArray(items) ? items : [];
}

export async function startTracking(listing: ListingData): Promise<void> {
  const tracked = await getTrackedListings();
  if (tracked.some((t) => t.listingId === listing.listingId)) return;

  const today = new Date().toISOString().split('T')[0];
  const snapshot: ListingSnapshot = {
    date: today,
    reviewCount: listing.reviewCount,
    favorites: listing.favorites,
    price: listing.price,
  };

  tracked.unshift({
    listingId: listing.listingId,
    title: listing.title,
    url: listing.url,
    imageUrl: listing.imageUrl,
    shopName: listing.shopName,
    startedAt: Date.now(),
    snapshots: [snapshot],
  });

  await browser.storage.local.set({ [STORAGE_KEY]: tracked });
}

export async function stopTracking(listingId: string): Promise<void> {
  const tracked = await getTrackedListings();
  await browser.storage.local.set({
    [STORAGE_KEY]: tracked.filter((t) => t.listingId !== listingId),
  });
}

export async function isTracked(listingId: string): Promise<boolean> {
  const tracked = await getTrackedListings();
  return tracked.some((t) => t.listingId === listingId);
}

export async function addDailySnapshots(
  updates: { listingId: string; snapshot: ListingSnapshot }[],
): Promise<void> {
  const tracked = await getTrackedListings();
  let changed = false;

  for (const update of updates) {
    const item = tracked.find((t) => t.listingId === update.listingId);
    if (!item) continue;

    const existing = item.snapshots.find((s) => s.date === update.snapshot.date);
    if (existing) {
      Object.assign(existing, update.snapshot);
    } else {
      item.snapshots.push(update.snapshot);
    }
    item.snapshots.sort((a, b) => a.date.localeCompare(b.date));
    changed = true;
  }

  if (changed) {
    await browser.storage.local.set({ [STORAGE_KEY]: tracked });
  }
}

export function setupTrackingAlarm(): void {
  browser.alarms.create(TRACKING_ALARM, { periodInMinutes: 24 * 60 });
}

export async function getTrackingTrend(
  listingId: string,
  days: number,
): Promise<ListingSnapshot[]> {
  const tracked = await getTrackedListings();
  const item = tracked.find((t) => t.listingId === listingId);
  if (!item) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  return item.snapshots.filter((s) => s.date >= cutoffStr);
}
