import type { ResearchReport } from './types/research';
import type { ListingData } from './types/listing';

export const MessageType = {
  RESEARCH_READY: 'RESEARCH_READY',
  COLLECTED_DATA: 'COLLECTED_DATA',
  REQUEST_RESEARCH: 'REQUEST_RESEARCH',
  TAB_CHANGED: 'TAB_CHANGED',
  SCRAPE_TAB: 'SCRAPE_TAB',
  SCRAPE_ERROR: 'SCRAPE_ERROR',
  SAVE_FAVORITE: 'SAVE_FAVORITE',
  REMOVE_FAVORITE: 'REMOVE_FAVORITE',
  START_TRACKING: 'START_TRACKING',
  STOP_TRACKING: 'STOP_TRACKING',
  TRACKING_UPDATED: 'TRACKING_UPDATED',
  FAVORITES_UPDATED: 'FAVORITES_UPDATED',
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export interface CollectedDataPayload {
  pageType: 'listing' | 'search' | 'other';
  query: string | null;
  listing: ListingData | null;
  shop: import('./types/shop').ShopData | null;
  competitors: import('./types/analytics').CompetitorMatch[];
}

export interface CollectedDataMessage extends CollectedDataPayload {
  type: typeof MessageType.COLLECTED_DATA;
}

export interface ResearchReadyPayload {
  type: typeof MessageType.RESEARCH_READY;
  report: ResearchReport;
}

export interface ResearchReadyMessage extends ResearchReadyPayload {
  tabId: number;
}

export interface RequestResearchMessage {
  type: typeof MessageType.REQUEST_RESEARCH;
  tabId?: number;
  force?: boolean;
}

export interface TabChangedMessage {
  type: typeof MessageType.TAB_CHANGED;
  tabId: number;
  report?: ResearchReport;
}

export interface ScrapeTabMessage {
  type: typeof MessageType.SCRAPE_TAB;
}

export interface ScrapeErrorPayload {
  type: typeof MessageType.SCRAPE_ERROR;
  error: string;
}

export interface ScrapeErrorMessage extends ScrapeErrorPayload {
  tabId: number;
}

export interface SaveFavoriteMessage {
  type: typeof MessageType.SAVE_FAVORITE;
  report: ResearchReport;
}

export interface RemoveFavoriteMessage {
  type: typeof MessageType.REMOVE_FAVORITE;
  listingId: string;
}

export interface StartTrackingMessage {
  type: typeof MessageType.START_TRACKING;
  listing: ListingData;
}

export interface StopTrackingMessage {
  type: typeof MessageType.STOP_TRACKING;
  listingId: string;
}

export interface TrackingUpdatedMessage {
  type: typeof MessageType.TRACKING_UPDATED;
}

export interface FavoritesUpdatedMessage {
  type: typeof MessageType.FAVORITES_UPDATED;
}

export type ExtensionMessage =
  | CollectedDataMessage
  | ResearchReadyMessage
  | ResearchReadyPayload
  | RequestResearchMessage
  | TabChangedMessage
  | ScrapeTabMessage
  | ScrapeErrorMessage
  | ScrapeErrorPayload
  | SaveFavoriteMessage
  | RemoveFavoriteMessage
  | StartTrackingMessage
  | StopTrackingMessage
  | TrackingUpdatedMessage
  | FavoritesUpdatedMessage;

export function isExtensionMessage(msg: unknown): msg is ExtensionMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    typeof (msg as ExtensionMessage).type === 'string'
  );
}

export function reportHasData(report: ResearchReport): boolean {
  return (
    report.listing != null ||
    report.competitors.length > 0 ||
    report.pageType === 'search'
  );
}

export function emptyReport(): ResearchReport {
  return {
    pageType: 'other',
    query: null,
    listing: null,
    shop: null,
    estimate: null,
    trend: null,
    opportunityScore: 0,
    competitors: [],
    market: null,
    scrapedAt: 0,
  };
}
