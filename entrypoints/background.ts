import type { ResearchReport } from '@/lib/types/research';
import type { CollectedDataPayload } from '@/lib/messaging';
import {
  MessageType,
  type ExtensionMessage,
  type SaveFavoriteMessage,
  type RemoveFavoriteMessage,
  type StartTrackingMessage,
  type StopTrackingMessage,
  emptyReport,
  reportHasData,
} from '@/lib/messaging';
import { buildResearchReport } from '@/lib/analytics/pipeline';
import { saveFavorite, removeFavorite } from '@/lib/storage/favorites';
import {
  startTracking,
  stopTracking,
  getTrackedListings,
  setupTrackingAlarm,
  TRACKING_ALARM,
} from '@/lib/storage/tracking';

const researchCache = new Map<number, ResearchReport>();
const scrapeTimers = new Map<number, ReturnType<typeof setTimeout>>();
/** Tab IDs where the user manually opened the side panel */
const openedPanelTabs = new Set<number>();
let suppressPanelCloseTracking = false;
const SIDEPANEL_PATH = 'sidepanel.html';

function isEtsyUrl(url?: string | null): boolean {
  return url != null && url.includes('etsy.com');
}

function getValidCachedReport(tabId: number): ResearchReport | null {
  const cached = researchCache.get(tabId);
  return cached && reportHasData(cached) ? cached : null;
}

async function broadcast(message: ExtensionMessage) {
  try {
    await browser.runtime.sendMessage(message);
  } catch {
    // side panel may not be open
  }
}

async function enableSidePanelForTab(tabId: number) {
  if (!browser.sidePanel?.setOptions) return;
  try {
    await browser.sidePanel.setOptions({
      tabId,
      path: SIDEPANEL_PATH,
      enabled: true,
    });
  } catch {
    // unsupported browser
  }
}

async function disableSidePanelForTab(tabId: number) {
  if (!browser.sidePanel?.setOptions) return;
  try {
    await browser.sidePanel.setOptions({ tabId, enabled: false });
  } catch {
    // unsupported browser
  }
}

async function disableSidePanelDefault() {
  if (!browser.sidePanel?.setOptions) return;
  try {
    await browser.sidePanel.setOptions({ path: SIDEPANEL_PATH, enabled: false });
  } catch {
    // unsupported browser
  }
}

async function closeSidePanelForTab(tabId: number) {
  if (!browser.sidePanel) return;
  try {
    if (browser.sidePanel.close) {
      await browser.sidePanel.close({ tabId });
      return;
    }
    await disableSidePanelForTab(tabId);
  } catch {
    // panel may not be open for this tab
  }
}

async function closeSidePanelForWindow(windowId: number) {
  if (!browser.sidePanel?.close) return;
  suppressPanelCloseTracking = true;
  try {
    await browser.sidePanel.close({ windowId });
  } catch {
    // panel may not be open in this window
  } finally {
    suppressPanelCloseTracking = false;
  }
}

async function openSidePanelForTab(tabId: number) {
  if (!browser.sidePanel?.open) return;
  try {
    await enableSidePanelForTab(tabId);
    await browser.sidePanel.open({ tabId });
  } catch {
    // may require user gesture in some browsers
  }
}

async function syncSidePanelForTab(tabId: number, url?: string | null) {
  if (isEtsyUrl(url)) {
    await enableSidePanelForTab(tabId);
  } else {
    await disableSidePanelForTab(tabId);
  }
}

async function handleSidePanelOnTabActivated(tabId: number, windowId: number) {
  const tab = await browser.tabs.get(tabId).catch(() => null);
  await syncSidePanelForTab(tabId, tab?.url);

  if (!isEtsyUrl(tab?.url)) {
    await closeSidePanelForWindow(windowId);
    return;
  }

  if (openedPanelTabs.has(tabId)) {
    await openSidePanelForTab(tabId);
    return;
  }

  await closeSidePanelForWindow(windowId);
}

async function requestScrapeForTab(tabId: number) {
  try {
    await browser.tabs.sendMessage(tabId, {
      type: MessageType.SCRAPE_TAB,
    } satisfies ExtensionMessage);
  } catch {
    const stale = getValidCachedReport(tabId);
    await broadcast({
      type: MessageType.RESEARCH_READY,
      tabId,
      report: stale ?? emptyReport(),
    });
  }
}

function scheduleScrapeForTab(tabId: number, delayMs = 400) {
  const existing = scrapeTimers.get(tabId);
  if (existing) clearTimeout(existing);

  scrapeTimers.set(
    tabId,
    setTimeout(() => {
      scrapeTimers.delete(tabId);
      void requestScrapeForTab(tabId);
    }, delayMs),
  );
}

async function processCollectedData(tabId: number, data: CollectedDataPayload) {
  const report = buildResearchReport({
    pageType: data.pageType,
    query: data.query,
    listing: data.listing,
    shop: data.shop,
    competitors: data.competitors,
  });

  if (reportHasData(report)) {
    researchCache.set(tabId, report);
  } else {
    researchCache.delete(tabId);
  }

  await broadcast({ type: MessageType.RESEARCH_READY, tabId, report });
}

async function pushResearchForTab(tabId: number, forceScrape = false) {
  const cached = getValidCachedReport(tabId);
  if (cached && !forceScrape) {
    await broadcast({ type: MessageType.RESEARCH_READY, tabId, report: cached });
    return;
  }

  const tab = await browser.tabs.get(tabId).catch(() => null);
  if (!tab || !isEtsyUrl(tab.url)) {
    await broadcast({ type: MessageType.RESEARCH_READY, tabId, report: emptyReport() });
    return;
  }

  await requestScrapeForTab(tabId);
}

async function handleTabActivated(tabId: number) {
  const tab = await browser.tabs.get(tabId).catch(() => null);

  if (!tab || !isEtsyUrl(tab.url)) {
    await broadcast({ type: MessageType.TAB_CHANGED, tabId, report: emptyReport() });
    return;
  }

  const cached = getValidCachedReport(tabId);
  if (cached) {
    await broadcast({ type: MessageType.TAB_CHANGED, tabId, report: cached });
    return;
  }

  await broadcast({ type: MessageType.TAB_CHANGED, tabId });
  await pushResearchForTab(tabId);
}

export default defineBackground(() => {
  if (browser.sidePanel?.setPanelBehavior) {
    browser.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
  }
  void disableSidePanelDefault();

  void browser.tabs.query({ url: '*://*.etsy.com/*' }).then((tabs) => {
    for (const tab of tabs) {
      if (tab.id != null) void enableSidePanelForTab(tab.id);
    }
  });

  browser.sidePanel?.onOpened?.addListener(({ tabId }) => {
    if (tabId != null) openedPanelTabs.add(tabId);
  });

  browser.sidePanel?.onClosed?.addListener(({ tabId }) => {
    if (suppressPanelCloseTracking || tabId == null) return;
    openedPanelTabs.delete(tabId);
  });

  setupTrackingAlarm();

  browser.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name !== TRACKING_ALARM) return;
    await broadcast({ type: MessageType.TRACKING_UPDATED });
  });

  browser.runtime.onMessage.addListener(
    (message: ExtensionMessage, sender): true | undefined => {
      const senderTabId = sender.tab?.id;

      if (message.type === MessageType.COLLECTED_DATA) {
        const tabId = senderTabId;
        if (tabId == null) return true;
        void processCollectedData(tabId, message);
        return true;
      }

      if (message.type === MessageType.SCRAPE_ERROR) {
        const tabId = 'tabId' in message ? message.tabId : senderTabId;
        if (tabId == null) return true;

        const stale = getValidCachedReport(tabId);
        broadcast({
          type: MessageType.RESEARCH_READY,
          tabId,
          report: stale ?? emptyReport(),
        });
        return true;
      }

      if (message.type === MessageType.REQUEST_RESEARCH) {
        void handleRequestResearch(message.tabId, message.force);
        return true;
      }

      if (message.type === MessageType.SAVE_FAVORITE) {
        void handleSaveFavorite(message);
        return true;
      }

      if (message.type === MessageType.REMOVE_FAVORITE) {
        void handleRemoveFavorite(message);
        return true;
      }

      if (message.type === MessageType.START_TRACKING) {
        void handleStartTracking(message);
        return true;
      }

      if (message.type === MessageType.STOP_TRACKING) {
        void handleStopTracking(message);
        return true;
      }

      return undefined;
    },
  );

  browser.tabs.onActivated.addListener(({ tabId, windowId }) => {
    void handleSidePanelOnTabActivated(tabId, windowId);
    void handleTabActivated(tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading' && changeInfo.url != null) {
      researchCache.delete(tabId);
      const timer = scrapeTimers.get(tabId);
      if (timer) {
        clearTimeout(timer);
        scrapeTimers.delete(tabId);
      }

      if (!isEtsyUrl(changeInfo.url)) {
        openedPanelTabs.delete(tabId);
        void closeSidePanelForTab(tabId);
        void disableSidePanelForTab(tabId);
      }
      return;
    }

    if (changeInfo.status === 'complete') {
      if (isEtsyUrl(tab.url)) {
        void enableSidePanelForTab(tabId);
        scheduleScrapeForTab(tabId);
      } else {
        void disableSidePanelForTab(tabId);
      }
    }
  });

  browser.tabs.onRemoved.addListener((tabId) => {
    researchCache.delete(tabId);
    const timer = scrapeTimers.get(tabId);
    if (timer) clearTimeout(timer);
    scrapeTimers.delete(tabId);
    openedPanelTabs.delete(tabId);
    void closeSidePanelForTab(tabId);
    void disableSidePanelForTab(tabId);
  });
});

async function handleRequestResearch(requestedTabId?: number, forceScrape = false) {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true });
  const tabId = requestedTabId ?? activeTab?.id;

  if (tabId == null) return;

  await pushResearchForTab(tabId, forceScrape);
}

async function handleSaveFavorite(message: SaveFavoriteMessage) {
  await saveFavorite(message.report);
  await broadcast({ type: MessageType.FAVORITES_UPDATED });
}

async function handleRemoveFavorite(message: RemoveFavoriteMessage) {
  await removeFavorite(message.listingId);
  await broadcast({ type: MessageType.FAVORITES_UPDATED });
}

async function handleStartTracking(message: StartTrackingMessage) {
  await startTracking(message.listing);
  await broadcast({ type: MessageType.TRACKING_UPDATED });
}

async function handleStopTracking(message: StopTrackingMessage) {
  await stopTracking(message.listingId);
  await broadcast({ type: MessageType.TRACKING_UPDATED });
}

export { getTrackedListings };
