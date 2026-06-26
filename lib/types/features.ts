export interface FeatureFlags {
  unlimitedTracking: boolean;
  historicalAnalytics: boolean;
  aiInsights: boolean;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  unlimitedTracking: false,
  historicalAnalytics: false,
  aiInsights: false,
};
