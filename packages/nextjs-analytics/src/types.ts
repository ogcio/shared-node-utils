import type { Analytics } from "@ogcio/analytics-sdk";

type TrackEventProps = Parameters<Analytics["track"]["event"]>[0];

type TrackPageViewProps = Parameters<Analytics["track"]["pageView"]>[0];

export type { TrackEventProps, TrackPageViewProps };
