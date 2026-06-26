import { ExternalLink, Pause, Play } from 'lucide-react';
import type { TrackedListing } from '@/lib/types/tracking';
import { formatCompact } from '@/lib/utils/format';
import { TrendChart } from '../TrendChart';

interface TrackingTabProps {
  tracked: TrackedListing[];
  onStop: (listingId: string) => void;
}

export function TrackingTab({ tracked, onStop }: TrackingTabProps) {
  if (tracked.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        No tracked listings. Start tracking from the Overview tab on any listing page.
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {tracked.map((item) => {
        const latest = item.snapshots[item.snapshots.length - 1];
        const earliest = item.snapshots[0];
        const reviewGrowth = latest && earliest ? latest.reviewCount - earliest.reviewCount : 0;
        const favGrowth =
          latest && earliest && latest.favorites != null && earliest.favorites != null
            ? latest.favorites - earliest.favorites
            : null;

        return (
          <div key={item.listingId} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex gap-3">
              {item.imageUrl && (
                <img src={item.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-semibold">{item.title}</p>
                <p className="text-xs text-muted">{item.shopName}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted hover:bg-surface hover:text-etsy"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button
                  type="button"
                  onClick={() => onStop(item.listingId)}
                  className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-600"
                  title="Stop tracking"
                >
                  <Pause className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-surface p-2">
                <p className="text-muted">Review growth</p>
                <p className="font-bold text-emerald-600">+{formatCompact(reviewGrowth)}</p>
              </div>
              <div className="rounded-lg bg-surface p-2">
                <p className="text-muted">Favorite growth</p>
                <p className="font-bold text-emerald-600">
                  {favGrowth != null ? `+${formatCompact(favGrowth)}` : 'N/A'}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2">
              <TrendChart snapshots={item.snapshots} field="reviewCount" label="Reviews" days={30} />
              <TrendChart snapshots={item.snapshots} field="favorites" label="Favorites" days={30} />
            </div>

            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted">
              <Play className="h-3 w-3" />
              Tracking since {new Date(item.startedAt).toLocaleDateString()} · {item.snapshots.length} snapshots
            </p>
          </div>
        );
      })}
    </div>
  );
}
