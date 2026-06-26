import type { ListingSnapshot } from '@/lib/types/tracking';

interface TrendChartProps {
  snapshots: ListingSnapshot[];
  field: 'reviewCount' | 'favorites';
  label: string;
  days?: number;
}

export function TrendChart({ snapshots, field, label, days = 30 }: TrendChartProps) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const data = snapshots
    .filter((s) => s.date >= cutoffStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-2 text-xs text-muted">No snapshot data yet</p>
      </div>
    );
  }

  const values = data.map((s) => (field === 'favorites' ? s.favorites ?? 0 : s.reviewCount));
  const max = Math.max(...values, 1);

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-muted">{label} ({days}d)</p>
      <div className="flex items-end gap-1" style={{ height: 60 }}>
        {data.map((s) => {
          const val = field === 'favorites' ? s.favorites ?? 0 : s.reviewCount;
          const height = Math.max(4, (val / max) * 100);
          return (
            <div key={s.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-etsy/80 transition-all"
                style={{ height: `${height}%` }}
                title={`${s.date}: ${val}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{data[0]?.date.slice(5)}</span>
        <span>{data[data.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}
