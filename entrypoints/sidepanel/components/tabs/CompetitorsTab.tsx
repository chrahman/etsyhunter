import { useMemo, useState } from 'react';
import { ExternalLink, Search } from 'lucide-react';
import type { ResearchReport } from '@/lib/types/research';
import type { CompetitorMatch, CompetitorSortKey } from '@/lib/types/analytics';
import { formatCompact, formatPrice, formatPercent } from '@/lib/utils/format';
import { EstimatedValue } from '../EstimatedValue';

interface CompetitorsTabProps {
  report: ResearchReport;
}

export function CompetitorsTab({ report }: CompetitorsTabProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<CompetitorSortKey>('similarity');

  const filtered = useMemo(() => {
    let items = [...report.competitors];
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.listing.title.toLowerCase().includes(q) ||
          c.listing.shopName.toLowerCase().includes(q),
      );
    }
    items.sort((a, b) => {
      switch (sortKey) {
        case 'similarity': return b.similarity - a.similarity;
        case 'estimatedSales': return b.estimate.totalSales - a.estimate.totalSales;
        case 'revenue': return b.estimate.monthlyRevenue - a.estimate.monthlyRevenue;
        case 'reviews': return b.listing.reviewCount - a.listing.reviewCount;
        case 'favorites': return (b.listing.favorites ?? 0) - (a.listing.favorites ?? 0);
        default: return 0;
      }
    });
    return items;
  }, [report.competitors, search, sortKey]);

  if (report.competitors.length === 0) {
    return (
      <div className="p-4 text-sm text-muted">
        No competitors found. Try a listing page with similar items or a search results page.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            placeholder="Search competitors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-card py-2 pl-8 pr-3 text-sm outline-none focus:border-etsy"
          />
        </div>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as CompetitorSortKey)}
          className="rounded-lg border border-border bg-card px-2 text-xs outline-none focus:border-etsy"
        >
          <option value="similarity">Similarity</option>
          <option value="estimatedSales">Est. Sales</option>
          <option value="revenue">Revenue</option>
          <option value="reviews">Reviews</option>
          <option value="favorites">Favorites</option>
        </select>
      </div>

      <p className="text-xs text-muted">{filtered.length} competitors</p>

      <div className="space-y-2">
        {filtered.map((c) => (
          <CompetitorCard key={c.listing.listingId} competitor={c} currency={report.listing?.currency ?? 'USD'} />
        ))}
      </div>
    </div>
  );
}

function CompetitorCard({ competitor, currency }: { competitor: CompetitorMatch; currency: string }) {
  const { listing, similarity, estimate } = competitor;
  return (
    <div className="flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      {listing.imageUrl && (
        <img src={listing.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-xs font-semibold leading-snug">{listing.title}</p>
          <span className="shrink-0 rounded-full bg-etsy-light px-2 py-0.5 text-xs font-bold text-etsy">
            {formatPercent(similarity)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted">{listing.shopName}</p>
        <div className="mt-1.5 flex flex-wrap gap-3 text-xs">
          <span><EstimatedValue value={formatCompact(estimate.totalSales)} /> sales</span>
          <span><EstimatedValue value={formatPrice(estimate.monthlyRevenue, currency)} />/mo</span>
          <span>{formatCompact(listing.reviewCount)} reviews</span>
        </div>
      </div>
      <a
        href={listing.url}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 self-start text-muted hover:text-etsy"
      >
        <ExternalLink className="h-4 w-4" />
      </a>
    </div>
  );
}
