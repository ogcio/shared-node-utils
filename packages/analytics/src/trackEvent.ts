import { type AnalyticsConfigProps, BBClient, type TrackEventProps } from ".";

export const trackEvent =
  (config: AnalyticsConfigProps) =>
  ({ event, metadataOverride, contextOverride }: TrackEventProps) => {
    const client = BBClient(config);

    client.analytics.track
      .event({ event, metadataOverride, contextOverride })
      .catch(() => {
        // TODO: Handle error
      });
  };
