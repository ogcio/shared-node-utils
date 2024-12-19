import type {
  BuildingBlocksSDK,
  getBuildingBlockSDK,
} from "@ogcio/building-blocks-sdk";

type AnalyticsClientProps = ReturnType<typeof getBuildingBlockSDK>["analytics"];

type AnalyticsTrackerProps = Parameters<
  AnalyticsClientProps["setTrackingContext"]
>[0] & { pathname?: string };

type TrackEventProps = Parameters<
  BuildingBlocksSDK["analytics"]["track"]["event"]
>[0];

export type { AnalyticsClientProps, AnalyticsTrackerProps, TrackEventProps };
