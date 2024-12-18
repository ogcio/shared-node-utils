import { type AnalyticsConfigProps, BBClient } from ".";

type TrackEventProps = {
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
};

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
