import type { ResearchReport } from '../types/research';

const STORAGE_KEY = 'favorites';

export interface FavoriteEntry {
  listingId: string;
  report: ResearchReport;
  savedAt: number;
}

export async function getFavorites(): Promise<FavoriteEntry[]> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const items = result[STORAGE_KEY];
  return Array.isArray(items) ? items : [];
}

export async function saveFavorite(report: ResearchReport): Promise<void> {
  if (!report.listing) return;

  const favorites = await getFavorites();
  const entry: FavoriteEntry = {
    listingId: report.listing.listingId,
    report,
    savedAt: Date.now(),
  };

  const index = favorites.findIndex((f) => f.listingId === entry.listingId);
  if (index >= 0) favorites[index] = entry;
  else favorites.unshift(entry);

  await browser.storage.local.set({ [STORAGE_KEY]: favorites });
}

export async function removeFavorite(listingId: string): Promise<void> {
  const favorites = await getFavorites();
  await browser.storage.local.set({
    [STORAGE_KEY]: favorites.filter((f) => f.listingId !== listingId),
  });
}

export async function isFavorite(listingId: string): Promise<boolean> {
  const favorites = await getFavorites();
  return favorites.some((f) => f.listingId === listingId);
}
