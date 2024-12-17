import { type AnalyticsConfigProps, BBClient } from ".";

export const trackNavigationEvent =
  (config: AnalyticsConfigProps) =>
  ({ pathname }: { pathname: string }) => {
    const client = BBClient(config);

    client.analytics.track
      .event({
        event: {
          action: pathname,
          category: "NAVIGATION",
          name: "Route_Request",
          value: 1,
        },
      })
      .catch(() => {
        // TODO: Handle error
      });
  };
