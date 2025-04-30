"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnalyticsTrackerProps } from ".";
import { AnalyticsClient } from "./client";

export const AnalyticsTracker = ({
  config,
  pathname,
  userId,
  customDimensions,
}: AnalyticsTrackerProps) => {
  const isInitialLoad = useRef(true);
  const isInitialized = useRef(false);

  const client = AnalyticsClient(config);

  const initAnalytics = useCallback(
    async (userId?: string) => {
      try {
        // do not track page view on init, as it will be tracked by the useEffect below
        await client.initClientTracker({ trackPageView: false });
        client.setTrackingContext({ customDimensions, userId });
      } catch {
        // TODO: Handle error
      }
    },
    [client, customDimensions]
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
        event: { title: document.title ?? pathname ?? "" },
      })
      .catch(() => {
        // TODO: Handle error
      });
  }, [pathname]);

  return null;
};
