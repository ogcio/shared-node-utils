"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnalyticsTrackerProps } from ".";
import { BBClient } from "./client";

export const AnalyticsTracker =
  ({ config, pathname, userId, customDimensions }: AnalyticsTrackerProps) => {
    const isInitialLoad = useRef(true);
    const isInitialized = useRef(false);

    const client = BBClient(config).analytics;

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
