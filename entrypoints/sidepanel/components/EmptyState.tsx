import type { ReactNode } from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
}

export function EmptyState({
  title = 'No data yet',
  description = 'Open an Etsy listing or search page to start researching.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon && <div className="mb-4 text-muted">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted">{description}</p>
    </div>
  );
}
