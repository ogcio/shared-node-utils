import type {
  BuildingBlocksSDK,
  getBuildingBlockSDK,
} from "@ogcio/building-blocks-sdk";
import type {
  GetAccessTokenParams,
  GetOrganizationTokenParams,
} from "@ogcio/building-blocks-sdk/dist/types";

type AnalyticsClientProps = ReturnType<typeof getBuildingBlockSDK>["analytics"];

type AnalyticsConfigProps = Parameters<
  typeof getBuildingBlockSDK
>["0"]["services"]["analytics"] &
  (GetAccessTokenParams | GetOrganizationTokenParams);

type AnalyticsTrackerProps = Parameters<
  AnalyticsClientProps["setTrackingContext"]
>[0] & { pathname?: string; config: AnalyticsConfigProps };

type TrackEventProps = Parameters<
  BuildingBlocksSDK["analytics"]["track"]["event"]
>[0];

export type {
  AnalyticsClientProps,
  AnalyticsTrackerProps,
  TrackEventProps,
  AnalyticsConfigProps,
};
