import { useCallback, useEffect, useRef } from "react";
import type { AnalyticsClientProps, AnalyticsTrackerProps } from ".";

export const AnalyticsTracker =
  (client: AnalyticsClientProps) =>
    ({ userId, customDimensions, pathname }: AnalyticsTrackerProps) => {
      const isInitialLoad = useRef(true);
      const isInitialized = useRef(false);

      const initAnalytics = useCallback(
        (userId?: string) => {
          client
            .initClientTracker({
              userId,
            })
            .then(() => {
              client.setTrackingContext({ customDimensions });
            })
            .catch(() => {
              // TODO: Handle error
            });
        },
        [client, customDimensions],
      );

      // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
      useEffect(() => {
        if (isInitialized.current) {
          return;
        }
        isInitialized.current = true;

        initAnalytics(userId);
      }, [userId]);

      // biome-ignore lint/correctness/useExhaustiveDependencies: Not needed
      useEffect(() => {
        if (isInitialLoad.current) {
          isInitialLoad.current = false;
          return;
        }

        client.track
          .pageView({
            event: { title: pathname ?? "" },
          })
          .catch(() => {
            // TODO: Handle error
          });
      }, [pathname]);

      return null;
    };
