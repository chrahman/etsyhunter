import { ExternalLink, Store } from 'lucide-react';
import type { ResearchReport } from '@/lib/types/research';
import { formatCompact, formatDays, formatPrice } from '@/lib/utils/format';
import { EstimatedValue } from '../EstimatedValue';
import type { ShopListing } from '@/lib/types/shop';
import { SortableTable, type Column } from '../SortableTable';

interface ShopTabProps {
  report: ResearchReport;
}

export function ShopTab({ report }: ShopTabProps) {
  const { shop, listing, estimate } = report;

  if (!shop) {
    return <div className="p-4 text-sm text-muted">Open a listing page to analyze the shop.</div>;
  }

  const avgSalesPerListing =
    shop.activeListings != null && shop.activeListings > 0 && shop.totalSales != null
      ? Math.round(shop.totalSales / shop.activeListings)
      : null;

  const estMonthlyShopRevenue =
    estimate && shop.activeListings != null && shop.activeListings > 0
      ? estimate.monthlyRevenue * shop.activeListings * 0.1
      : null;

  const columns: Column<ShopListing>[] = [
    {
      key: 'title',
      label: 'Listing',
      render: (row) => (
        <a href={row.url} target="_blank" rel="noopener noreferrer" className="line-clamp-1 text-xs font-medium hover:text-etsy">
          {row.title}
        </a>
      ),
    },
    {
      key: 'price',
      label: 'Price',
      sortable: true,
      sortValue: (row) => row.price,
      render: (row) => formatPrice(row.price, row.currency),
    },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-etsy-light">
          <Store className="h-5 w-5 text-etsy" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold">{shop.shopName}</h3>
          {shop.shopUrl && (
            <a
              href={shop.shopUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-etsy hover:underline"
            >
              View shop <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Metric label="Total Sales" value={formatCompact(shop.totalSales)} />
        <Metric label="Total Reviews" value={formatCompact(shop.totalReviews)} />
        <Metric label="Avg. Rating" value={shop.averageRating?.toFixed(1) ?? 'N/A'} />
        <Metric label="Shop Age" value={formatDays(shop.shopAgeDays)} />
        <Metric label="Active Listings" value={formatCompact(shop.activeListings)} />
        <Metric label="Avg. Sales/Listing" value={formatCompact(avgSalesPerListing)} />
      </div>

      {estMonthlyShopRevenue != null && listing && (
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-xs text-muted">Est. Shop Monthly Revenue</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">
            <EstimatedValue value={formatPrice(estMonthlyShopRevenue, listing.currency)} />
          </p>
          <p className="mt-1 text-xs text-muted">Rough estimate based on listing performance × catalog size</p>
        </div>
      )}

      {shop.topListings.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Top Shop Listings</h4>
          <SortableTable
            columns={columns}
            data={shop.topListings}
            keyExtractor={(r) => r.listingId}
          />
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}
