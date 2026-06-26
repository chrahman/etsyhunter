import { useCallback, useEffect, useMemo, useReducer, useState } from "react";
import { Heart, RefreshCw, Star } from "lucide-react";
import type { ResearchReport } from "@/lib/types/research";
import type { ScrapeStatus } from "@/lib/types/listing";
import type { TrackedListing } from "@/lib/types/tracking";
import { MessageType, isExtensionMessage, emptyReport, reportHasData } from "@/lib/messaging";
import { getFavorites, type FavoriteEntry } from "@/lib/storage/favorites";
import { getTrackedListings } from "@/lib/storage/tracking";
import { Header } from "./components/Header";
import { TabBar, type TabId } from "./components/TabBar";
import { EmptyState } from "./components/EmptyState";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { OverviewTab } from "./components/tabs/OverviewTab";
import { SalesTab } from "./components/tabs/SalesTab";
import { CompetitorsTab } from "./components/tabs/CompetitorsTab";
import { MarketTab } from "./components/tabs/MarketTab";
import { ShopTab } from "./components/tabs/ShopTab";
import { TrackingTab } from "./components/tabs/TrackingTab";
import { FavoritesTab } from "./components/tabs/FavoritesTab";

async function getActiveTabId(): Promise<number | null> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

function statusFromReport(report: ResearchReport): ScrapeStatus {
  return reportHasData(report) ? "ready" : "idle";
}

interface TabEntry {
  report: ResearchReport;
  status: ScrapeStatus;
}

interface ResearchState {
  activeTabId: number | null;
  byTab: Record<number, TabEntry>;
}

type ResearchAction =
  | { type: "SET_ACTIVE_TAB"; tabId: number }
  | { type: "TAB_CHANGED"; tabId: number; report?: ResearchReport }
  | { type: "RESEARCH_READY"; tabId: number; report: ResearchReport }
  | { type: "REQUEST_LOADING"; tabId: number };

function tabEntry(report: ResearchReport, status: ScrapeStatus): TabEntry {
  return { report, status };
}

function researchReducer(state: ResearchState, action: ResearchAction): ResearchState {
  switch (action.type) {
    case "SET_ACTIVE_TAB":
      return { ...state, activeTabId: action.tabId };

    case "TAB_CHANGED": {
      const next: ResearchState = { ...state, activeTabId: action.tabId };
      if (action.report && reportHasData(action.report)) {
        next.byTab = {
          ...state.byTab,
          [action.tabId]: tabEntry(action.report, statusFromReport(action.report)),
        };
      } else if (!state.byTab[action.tabId]) {
        next.byTab = {
          ...state.byTab,
          [action.tabId]: tabEntry(emptyReport(), "loading"),
        };
      }
      return next;
    }

    case "REQUEST_LOADING": {
      const existing = state.byTab[action.tabId];
      if (existing && reportHasData(existing.report)) {
        return {
          ...state,
          activeTabId: action.tabId,
          byTab: {
            ...state.byTab,
            [action.tabId]: { ...existing, status: "loading" },
          },
        };
      }
      return {
        ...state,
        activeTabId: action.tabId,
        byTab: {
          ...state.byTab,
          [action.tabId]: tabEntry(emptyReport(), "loading"),
        },
      };
    }

    case "RESEARCH_READY": {
      const existing = state.byTab[action.tabId];
      if (!reportHasData(action.report) && existing && reportHasData(existing.report)) {
        return {
          ...state,
          byTab: {
            ...state.byTab,
            [action.tabId]: { ...existing, status: "loading" },
          },
        };
      }

      return {
        ...state,
        byTab: {
          ...state.byTab,
          [action.tabId]: tabEntry(action.report, statusFromReport(action.report)),
        },
      };
    }

    default:
      return state;
  }
}

const initialResearchState: ResearchState = {
  activeTabId: null,
  byTab: {},
};

function App() {
  const [research, dispatch] = useReducer(researchReducer, initialResearchState);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [tracked, setTracked] = useState<TrackedListing[]>([]);

  const { activeTabId, byTab } = research;
  const current = activeTabId != null ? byTab[activeTabId] : undefined;
  const report = current?.report ?? emptyReport();
  const status = current?.status ?? (activeTabId == null ? "idle" : "loading");

  const trackedIds = useMemo(() => new Set(tracked.map((t) => t.listingId)), [tracked]);
  const favoriteIds = useMemo(() => new Set(favorites.map((f) => f.listingId)), [favorites]);

  const loadFavorites = useCallback(async () => {
    setFavorites(await getFavorites());
  }, []);

  const loadTracked = useCallback(async () => {
    setTracked(await getTrackedListings());
  }, []);

  const requestResearch = useCallback(async (tabId?: number, force = false) => {
    const id = tabId ?? (await getActiveTabId());
    if (id == null) return;
    dispatch({ type: "REQUEST_LOADING", tabId: id });
    await browser.runtime.sendMessage({
      type: MessageType.REQUEST_RESEARCH,
      tabId: id,
      force,
    });
  }, []);

  const handleSaveFavorite = useCallback(() => {
    if (report.listing) {
      browser.runtime.sendMessage({ type: MessageType.SAVE_FAVORITE, report });
    }
  }, [report]);

  const handleRemoveFavorite = useCallback((listingId: string) => {
    browser.runtime.sendMessage({ type: MessageType.REMOVE_FAVORITE, listingId });
  }, []);

  const handleStartTracking = useCallback(
    (listingId?: string) => {
      const listing = listingId ? (favorites.find((f) => f.listingId === listingId)?.report.listing ?? report.listing) : report.listing;
      if (listing) {
        browser.runtime.sendMessage({ type: MessageType.START_TRACKING, listing });
      }
    },
    [report.listing, favorites],
  );

  const handleStopTracking = useCallback((listingId: string) => {
    browser.runtime.sendMessage({ type: MessageType.STOP_TRACKING, listingId });
  }, []);

  useEffect(() => {
    void loadFavorites();
    void loadTracked();

    void (async () => {
      const tabId = await getActiveTabId();
      if (tabId == null) return;
      dispatch({ type: "REQUEST_LOADING", tabId });
      await browser.runtime.sendMessage({ type: MessageType.REQUEST_RESEARCH, tabId });
    })();

    const listener = (message: unknown) => {
      if (!isExtensionMessage(message)) return;

      if (message.type === MessageType.TAB_CHANGED) {
        dispatch({
          type: "TAB_CHANGED",
          tabId: message.tabId,
          report: message.report,
        });
        return;
      }

      if (message.type === MessageType.RESEARCH_READY && "tabId" in message) {
        dispatch({
          type: "RESEARCH_READY",
          tabId: message.tabId,
          report: message.report,
        });
      }

      if (message.type === MessageType.FAVORITES_UPDATED) {
        void loadFavorites();
      }

      if (message.type === MessageType.TRACKING_UPDATED) {
        void loadTracked();
      }
    };

    browser.runtime.onMessage.addListener(listener);
    return () => browser.runtime.onMessage.removeListener(listener);
  }, [loadFavorites, loadTracked]);

  const hasListing = report.listing != null;
  const isFavorite = report.listing ? favoriteIds.has(report.listing.listingId) : false;
  const isTracked = report.listing ? trackedIds.has(report.listing.listingId) : false;

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <TabBar active={activeTab} onChange={setActiveTab} favoritesCount={favorites.length} trackingCount={tracked.length} />

      {hasListing && activeTab === "overview" && status === "ready" && (
        <div className="flex gap-2 border-b border-border bg-card px-4 py-2">
          <button
            type="button"
            onClick={() => (isFavorite ? handleRemoveFavorite(report.listing!.listingId) : handleSaveFavorite())}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
          >
            <Heart className={`h-3.5 w-3.5 ${isFavorite ? "fill-etsy text-etsy" : ""}`} />
            {isFavorite ? "Saved" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => (isTracked ? handleStopTracking(report.listing!.listingId) : handleStartTracking())}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border py-1.5 text-xs font-medium hover:bg-surface"
          >
            <Star className={`h-3.5 w-3.5 ${isTracked ? "fill-amber-400 text-amber-500" : ""}`} />
            {isTracked ? "Tracking" : "Track"}
          </button>
          <button
            type="button"
            onClick={() => void requestResearch(activeTabId ?? undefined, true)}
            className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {status === "loading" && <LoadingSkeleton />}

      {status === "idle" && <EmptyState />}

      {status === "ready" &&
        activeTab === "overview" &&
        (hasListing ? <OverviewTab report={report} /> : <EmptyState title="Search results loaded" description={`Found ${report.competitors.length} listings. Switch to Competitors or Market tab.`} />)}

      {status === "ready" && activeTab === "sales" && <SalesTab report={report} />}
      {status === "ready" && activeTab === "competitors" && <CompetitorsTab report={report} />}
      {status === "ready" && activeTab === "market" && <MarketTab report={report} />}
      {status === "ready" && activeTab === "shop" && <ShopTab report={report} />}

      {activeTab === "tracking" && <TrackingTab tracked={tracked} onStop={handleStopTracking} />}

      {activeTab === "favorites" && <FavoritesTab favorites={favorites} trackedIds={trackedIds} onRemove={handleRemoveFavorite} onTrack={handleStartTracking} onStopTrack={handleStopTracking} />}
    </div>
  );
}

export default App;
