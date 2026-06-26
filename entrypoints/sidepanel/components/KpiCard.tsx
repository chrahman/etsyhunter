import type { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  accent?: 'default' | 'etsy' | 'green' | 'blue';
}

const accentStyles = {
  default: 'text-gray-900',
  etsy: 'text-etsy',
  green: 'text-emerald-600',
  blue: 'text-blue-600',
};

export function KpiCard({ label, value, sub, icon: Icon, accent = 'default' }: KpiCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted">{label}</p>
        {Icon && <Icon className={`h-4 w-4 shrink-0 ${accentStyles[accent]}`} />}
      </div>
      <p className={`mt-1 text-lg font-bold ${accentStyles[accent]}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}
