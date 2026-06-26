import { CheckCircle2, HelpCircle } from 'lucide-react';
import type { ResearchReport } from '@/lib/types/research';
import { formatCompact, formatPrice } from '@/lib/utils/format';
import { ConfidenceBadge } from '../ConfidenceBadge';
import { EstimatedValue } from '../EstimatedValue';
import { Tooltip } from '../Tooltip';

interface SalesTabProps {
  report: ResearchReport;
}

export function SalesTab({ report }: SalesTabProps) {
  const { listing, estimate } = report;
  if (!listing || !estimate) {
    return (
      <div className="p-4 text-sm text-muted">
        Open a listing page to view sales intelligence.
      </div>
    );
  }

  const rows = [
    { label: 'Total Sales', value: formatCompact(estimate.totalSales), tip: 'Estimated from review count and competitor percentile' },
    { label: 'Monthly Sales', value: formatCompact(estimate.monthlySales), tip: 'Based on review velocity (30d) with 15% review rate' },
    { label: 'Monthly Revenue', value: formatPrice(estimate.monthlyRevenue, listing.currency), tip: 'Monthly sales × listing price' },
    { label: 'Annual Revenue', value: formatPrice(estimate.annualRevenue, listing.currency), tip: 'Monthly revenue × 12' },
  ];

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Sales Estimates</h3>
        <ConfidenceBadge level={estimate.confidence} />
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-sm text-muted">
              {row.label}
              <Tooltip text={row.tip}>
                <HelpCircle className="h-3.5 w-3.5" />
              </Tooltip>
            </span>
            <EstimatedValue value={row.value} />
          </div>
        ))}
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Estimation Factors</h4>
        <ul className="space-y-1.5">
          {estimate.factors.map((factor) => (
            <li key={factor} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              {factor}
            </li>
          ))}
        </ul>
      </div>

      <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        All sales and revenue figures are estimates based on publicly visible data. Actual sales may differ significantly.
      </p>
    </div>
  );
}
