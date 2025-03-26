import { Analytics, AnalyticsOptions } from "@ogcio/analytics-sdk";


type AnalyticsClientProps = Analytics;

type AnalyticsConfigProps = AnalyticsOptions;

type AnalyticsTrackerProps = Parameters<
  AnalyticsClientProps["setTrackingContext"]
>[0] & { pathname?: string; config: AnalyticsConfigProps };

type TrackEventProps = Parameters<
  Analytics["track"]["event"]
>[0];

export type {
  AnalyticsClientProps,
  AnalyticsTrackerProps,
  TrackEventProps,
  AnalyticsConfigProps,
};
