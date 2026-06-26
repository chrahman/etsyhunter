import type { ResearchReport } from '@/lib/types/research';
import { formatCompact, formatPrice } from '@/lib/utils/format';
import { OpportunityBadge } from '../OpportunityBadge';
import { SortableTable, type Column } from '../SortableTable';
import type { ListingData } from '@/lib/types/listing';

interface MarketTabProps {
  report: ResearchReport;
}

const levelColors = {
  Low: 'bg-gray-100 text-gray-700',
  Medium: 'bg-amber-100 text-amber-800',
  High: 'bg-emerald-100 text-emerald-800',
  Emerging: 'bg-blue-100 text-blue-800',
  Growing: 'bg-teal-100 text-teal-800',
  Saturated: 'bg-red-100 text-red-700',
};

function LevelBadge({ label, value }: { label: string; value: string }) {
  const color = levelColors[value as keyof typeof levelColors] ?? 'bg-gray-100 text-gray-700';
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>
        {value}
      </span>
    </div>
  );
}

export function MarketTab({ report }: MarketTabProps) {
  const { market } = report;
  if (!market) {
    return <div className="p-4 text-sm text-muted">No market data available.</div>;
  }

  const columns: Column<ListingData>[] = [
    {
      key: 'title',
      label: 'Listing',
      render: (row) => (
        <span className="line-clamp-1 text-xs font-medium">{row.title}</span>
      ),
    },
    {
      key: 'reviews',
      label: 'Reviews',
      sortable: true,
      sortValue: (row) => row.reviewCount,
      render: (row) => formatCompact(row.reviewCount),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      sortValue: (row) => row.price,
      render: (row) => formatPrice(row.price, row.currency),
    },
    {
      key: 'favorites',
      label: 'Favs',
      sortable: true,
      sortValue: (row) => row.favorites ?? 0,
      render: (row) => formatCompact(row.favorites),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="grid grid-cols-3 gap-2">
        <LevelBadge label="Demand" value={market.demand} />
        <LevelBadge label="Competition" value={market.competition} />
        <LevelBadge label="Maturity" value={market.maturity} />
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
        <span className="text-sm font-medium">Market Opportunity</span>
        <OpportunityBadge score={market.marketOpportunityScore} />
      </div>

      <p className="text-sm text-muted">{market.summary}</p>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-xs text-muted">Avg. Price</p>
          <p className="text-sm font-bold">{formatPrice(market.averages.price, report.listing?.currency ?? 'USD')}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-xs text-muted">Avg. Reviews</p>
          <p className="text-sm font-bold">{formatCompact(market.averages.reviews)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-xs text-muted">Avg. Favorites</p>
          <p className="text-sm font-bold">{formatCompact(market.averages.favorites)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2 text-center">
          <p className="text-xs text-muted">Avg. Rating</p>
          <p className="text-sm font-bold">{market.averages.rating ?? 'N/A'}</p>
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Top Competitors</h4>
        <SortableTable
          columns={columns}
          data={market.topCompetitors}
          keyExtractor={(r) => r.listingId}
          emptyMessage="No competitors in market analysis"
        />
      </div>
    </div>
  );
}
