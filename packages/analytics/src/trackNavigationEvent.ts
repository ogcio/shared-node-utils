import {
  type AnalyticsConfigProps,
  BBClient,
  NAVIGATION_EVENT_CATEGORY,
  NAVIGATION_EVENT_NAME,
} from ".";
import { trackEvent } from "./trackEvent";

export const trackNavigationEvent =
  (config: AnalyticsConfigProps) =>
  ({ pathname }: { pathname: string }) => {
    trackEvent(config)({
      event: {
        action: pathname,
        category: NAVIGATION_EVENT_CATEGORY,
        name: NAVIGATION_EVENT_NAME,
        value: 1,
      },
    });
  };
