import { Analytics, AnalyticsOptions } from "@ogcio/analytics-sdk";

export const AnalyticsClient = (config:AnalyticsOptions ) => new Analytics(config);
