import type { Analytics } from "@ogcio/analytics-sdk";
import type { TrackPageViewProps } from "./types";

export const trackNavigationEvent =
  (client: Analytics) =>
  ({
    pathname,
    title,
    contextOverride,
    metadataOverride,
  }: { pathname: string; title?: string } & Omit<
    TrackPageViewProps,
    "event"
  >) => {
    client.track
      .pageView({
        event: {
          title: title || pathname,
        },
        metadataOverride: {
          ...metadataOverride,
          url: pathname,
        },
        contextOverride,
      })
      .catch(() => {
        // TODO: Handle error
      });
  };
