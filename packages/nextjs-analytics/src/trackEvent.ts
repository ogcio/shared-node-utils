import type { Analytics } from "@ogcio/analytics-sdk";
import type { TrackEventProps } from "./types";

export const trackEvent =
  (client: Analytics) =>
  ({ event, metadataOverride, contextOverride }: TrackEventProps) => {
    client.track
      .event({ event, metadataOverride, contextOverride })
      .catch(() => {
        // TODO: Handle error
      });
  };
