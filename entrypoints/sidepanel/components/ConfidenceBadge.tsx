import type { ConfidenceLevel } from '@/lib/types/analytics';

const styles: Record<ConfidenceLevel, string> = {
  high: 'bg-emerald-100 text-emerald-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-gray-100 text-gray-600',
};

interface ConfidenceBadgeProps {
  level: ConfidenceLevel;
}

export function ConfidenceBadge({ level }: ConfidenceBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${styles[level]}`}>
      {level} confidence
    </span>
  );
}
