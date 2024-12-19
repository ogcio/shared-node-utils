import type { AnalyticsClientProps, TrackEventProps } from ".";

export const trackEvent =
  (client: AnalyticsClientProps) =>
  ({ event, metadataOverride, contextOverride }: TrackEventProps) => {
    client.track
      .event({ event, metadataOverride, contextOverride })
      .catch(() => {
        // TODO: Handle error
      });
  };
