import { opportunityColor, opportunityLabel } from '@/lib/analytics/opportunity';

interface OpportunityBadgeProps {
  score: number;
}

const colorStyles = {
  green: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  yellow: 'bg-amber-100 text-amber-800 border-amber-200',
  red: 'bg-red-100 text-red-700 border-red-200',
};

export function OpportunityBadge({ score }: OpportunityBadgeProps) {
  const color = opportunityColor(score);
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colorStyles[color]}`}>
      {score} · {opportunityLabel(score)}
    </span>
  );
}
