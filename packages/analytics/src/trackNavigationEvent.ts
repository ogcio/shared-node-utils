import {
  type AnalyticsConfigProps,
  BBClient,
  NAVIGATION_EVENT_CATEGORY,
  NAVIGATION_EVENT_NAME,
} from ".";

export const trackNavigationEvent =
  (config: AnalyticsConfigProps) =>
  ({ pathname }: { pathname: string }) => {
    const client = BBClient(config);

    client.analytics.track
      .event({
        event: {
          action: pathname,
          category: NAVIGATION_EVENT_CATEGORY,
          name: NAVIGATION_EVENT_NAME,
          value: 1,
        },
      })
      .catch(() => {
        // TODO: Handle error
      });
  };
