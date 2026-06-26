import { ExternalLink, Heart, Pause, Star } from 'lucide-react';
import type { FavoriteEntry } from '@/lib/storage/favorites';
import { formatCompact, formatPrice } from '@/lib/utils/format';
import { OpportunityBadge } from '../OpportunityBadge';
import { EstimatedValue } from '../EstimatedValue';

interface FavoritesTabProps {
  favorites: FavoriteEntry[];
  trackedIds: Set<string>;
  onRemove: (listingId: string) => void;
  onTrack: (listingId: string) => void;
  onStopTrack: (listingId: string) => void;
}

export function FavoritesTab({
  favorites,
  trackedIds,
  onRemove,
  onTrack,
  onStopTrack,
}: FavoritesTabProps) {
  if (favorites.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        No favorites yet. Save listings from any research tab.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {favorites.map(({ listingId, report, savedAt }) => {
        const listing = report.listing;
        if (!listing) return null;
        const isTracked = trackedIds.has(listingId);

        return (
          <div key={listingId} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex gap-3">
              {listing.imageUrl && (
                <img src={listing.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold">{listing.title}</p>
                <p className="text-xs text-muted">{listing.shopName}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <OpportunityBadge score={report.opportunityScore} />
                  {report.estimate && (
                    <>
                      <span className="text-xs">
                        <EstimatedValue value={formatCompact(report.estimate.totalSales)} /> sales
                      </span>
                      <span className="text-xs">
                        <EstimatedValue value={formatPrice(report.estimate.monthlyRevenue, listing.currency)} />/mo
                      </span>
                    </>
                  )}
                </div>
                <p className="mt-1 text-[10px] text-muted">
                  Saved {new Date(savedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-surface"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open
              </a>
              <button
                type="button"
                onClick={() => (isTracked ? onStopTrack(listingId) : onTrack(listingId))}
                className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-surface"
              >
                {isTracked ? (
                  <><Pause className="h-3.5 w-3.5" /> Untrack</>
                ) : (
                  <><Star className="h-3.5 w-3.5" /> Track</>
                )}
              </button>
              <button
                type="button"
                onClick={() => onRemove(listingId)}
                className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Heart className="h-3.5 w-3.5 fill-current" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
