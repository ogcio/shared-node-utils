import type { getBuildingBlockSDK } from "@ogcio/building-blocks-sdk";

type AnalyticsClientProps = ReturnType<typeof getBuildingBlockSDK>["analytics"];

type AnalyticsTrackerProps = Parameters<
  AnalyticsClientProps["setTrackingContext"]
>[0];

interface TrackEventProps {
  event: {
    category: string;
    action: string;
    name?: string;
    value?: number;
  };
  metadataOverride?: {
    url?: string;
    userAgent?: string;
    referrer?: string;
    language?: string;
    screenResolution?: string;
  };
  contextOverride?: {
    userId?: string;
    customDimensions?: {
      [key: string]: string;
    };
  };
  siteIds?: number[];
}

export type { AnalyticsClientProps, AnalyticsTrackerProps, TrackEventProps };
