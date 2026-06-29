import { Award, Star, TrendingUp, DollarSign, ShoppingBag, Target } from 'lucide-react';
import type { ResearchReport } from '@/lib/types/research';
import { formatCompact, formatPrice } from '@/lib/utils/format';
import { KpiCard } from '../KpiCard';
import { ListingStrengthBadge } from '../ListingStrengthBadge';
import { ConfidenceBadge } from '../ConfidenceBadge';

interface OverviewTabProps {
  report: ResearchReport;
}

export function OverviewTab({ report }: OverviewTabProps) {
  const { listing, estimate, trend, opportunityScore } = report;
  if (!listing) return null;

  return (
    <div className="space-y-4 p-4">
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {listing.imageUrl && (
          <img src={listing.imageUrl} alt={listing.title} className="h-40 w-full object-cover" />
        )}
        <div className="p-4">
          <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{listing.title}</h2>
          <p className="mt-1 text-xs text-muted">{listing.shopName}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {listing.bestseller && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                <Award className="h-3 w-3" /> Bestseller
              </span>
            )}
            {listing.etsyPick && (
              <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                <Star className="h-3 w-3" /> Etsy&apos;s Pick
              </span>
            )}
            <ListingStrengthBadge score={opportunityScore} />
          </div>
        </div>
      </div>

      {estimate && (
        <div className="grid grid-cols-2 gap-2">
          <KpiCard
            label="Est. Total Sales"
            value={formatCompact(estimate.totalSales)}
            icon={ShoppingBag}
            accent="etsy"
          />
          <KpiCard
            label="Est. Monthly Revenue"
            value={formatPrice(estimate.monthlyRevenue, listing.currency)}
            icon={DollarSign}
            accent="green"
          />
          <KpiCard
            label="Est. Monthly Sales"
            value={formatCompact(estimate.monthlySales)}
            icon={TrendingUp}
            accent="blue"
          />
          <KpiCard
            label="Listing Strength"
            value={`${opportunityScore}/100`}
            icon={Target}
            accent="etsy"
          />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {estimate && <ConfidenceBadge level={estimate.confidence} />}
        {trend && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {trend.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="text-xs text-muted">Reviews</p>
          <p className="text-sm font-bold">{formatCompact(listing.reviewCount)}</p>
          {listing.rating != null && listing.reviewCount > 0 && (
            <p className="text-[10px] text-muted">{listing.rating.toFixed(1)} ★</p>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="text-xs text-muted">Favorites</p>
          <p className="text-sm font-bold">{formatCompact(listing.favorites)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-2">
          <p className="text-xs text-muted">Price</p>
          <p className="text-sm font-bold">{formatPrice(listing.price, listing.currency)}</p>
        </div>
      </div>
    </div>
  );
}
