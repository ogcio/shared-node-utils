import type { getBuildingBlockSDK } from "@ogcio/building-blocks-sdk";

type AnalyticsClientProps = ReturnType<typeof getBuildingBlockSDK>["analytics"];

interface AnalyticsTrackerProps {
  /**
   * The user ID to track.
   * Ensure that the user ID is unique to the user.
   * Tracking the UserID should be done in compliance with the GDPR.
   * @default undefined
   */
  userId?: string;
  customDimensions?: {
    [x: `dimension${number}`]: string;
  };
}

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