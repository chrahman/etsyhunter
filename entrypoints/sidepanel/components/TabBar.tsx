import type { ReactNode } from 'react';
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  PieChart,
  Store,
  Activity,
  Heart,
} from 'lucide-react';

export type TabId =
  | 'overview'
  | 'sales'
  | 'competitors'
  | 'market'
  | 'shop'
  | 'tracking'
  | 'favorites';

interface TabBarProps {
  active: TabId;
  onChange: (tab: TabId) => void;
  favoritesCount: number;
  trackingCount: number;
}

const tabs: { id: TabId; label: string; icon: ReactNode; badge?: 'favorites' | 'tracking' }[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-3.5 w-3.5" /> },
  { id: 'sales', label: 'Sales', icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: 'competitors', label: 'Competitors', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'market', label: 'Market', icon: <PieChart className="h-3.5 w-3.5" /> },
  { id: 'shop', label: 'Shop', icon: <Store className="h-3.5 w-3.5" /> },
  { id: 'tracking', label: 'Tracking', icon: <Activity className="h-3.5 w-3.5" />, badge: 'tracking' },
  { id: 'favorites', label: 'Favorites', icon: <Heart className="h-3.5 w-3.5" />, badge: 'favorites' },
];

export function TabBar({ active, onChange, favoritesCount, trackingCount }: TabBarProps) {
  return (
    <nav className="flex overflow-x-auto border-b border-border bg-card scrollbar-none">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        const count =
          tab.badge === 'favorites' ? favoritesCount : tab.badge === 'tracking' ? trackingCount : 0;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex shrink-0 items-center justify-center gap-1 px-3 py-2.5 text-xs font-medium transition ${
              isActive
                ? 'border-b-2 border-etsy text-etsy'
                : 'text-muted hover:text-gray-900'
            }`}
          >
            {tab.icon}
            {tab.label}
            {count > 0 && (
              <span className="rounded-full bg-etsy px-1.5 py-0.5 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
