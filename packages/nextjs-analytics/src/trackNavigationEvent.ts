import {
  type AnalyticsClientProps,
  NAVIGATION_EVENT_CATEGORY,
  NAVIGATION_EVENT_NAME,
} from ".";
import { trackEvent } from "./trackEvent";

export const trackNavigationEvent =
  (client: AnalyticsClientProps) =>
  ({ pathname }: { pathname: string }) => {
    trackEvent(client)({
      event: {
        action: pathname,
        category: NAVIGATION_EVENT_CATEGORY,
        name: NAVIGATION_EVENT_NAME,
        value: 1,
      },
    });
  };
