"use client";

import { Analytics, AnalyticsOptions } from "@ogcio/analytics-sdk";
import { createContext, useContext, useEffect, useMemo } from "react";

type AnalyticsContextValue = {
  analyticsInstance?: Analytics;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  analyticsInstance: undefined,
});

let analytics: Analytics;
function getAnalytics(analyticsConfig: AnalyticsOptions) {
  if (analytics) return analytics;
  analytics = new Analytics(analyticsConfig);

  return analytics;
}

const AnalyticsProvider = ({
  config,
  children,
}: {
  config: AnalyticsOptions;
  children: React.ReactNode;
}) => {
  const context = useMemo(() => {
    return {
      analyticsInstance: getAnalytics(config),
    };
  }, [config]);

  // Defer DOM operations until after hydration
  useEffect(() => {
    if (typeof window !== "undefined" && context.analyticsInstance) {
      try {
        console.log("Analytics: Initializing client tracker");
        context.analyticsInstance
          .initClientTracker({ trackPageView: false })
          .then(() => {
            context.analyticsInstance.track.pageView({
              event: {
                title: window.document.title,
              },
            });
          });
      } catch (e) {
        console.warn("Analytics: Error init client tracker");
        console.error(e);
      }
    }
  }, [context.analyticsInstance]);

  return (
    <AnalyticsContext.Provider value={context}>
      {children}
    </AnalyticsContext.Provider>
  );
};

type EventParameters = Parameters<
  InstanceType<typeof Analytics>["track"]["event"]
>;
type PageViewParameters = Parameters<
  InstanceType<typeof Analytics>["track"]["pageView"]
>;
type SetTrackingContextParameters = Parameters<
  InstanceType<typeof Analytics>["setTrackingContext"]
>;

type TrackEventProps = Parameters<Analytics["track"]["event"]>[0];

export const useAnalytics = (config?: {
  contextOverride: SetTrackingContextParameters[0];
}) => {
  const { analyticsInstance } = useContext(AnalyticsContext);

  useEffect(() => {
    if (config?.contextOverride && analyticsInstance) {
      analyticsInstance.setTrackingContext(config.contextOverride);
    }
    return () => {
      analyticsInstance?.setTrackingContext({});
    };
  }, [config, analyticsInstance]);

  return {
    trackEvent: (data: TrackEventProps) => {
      return analyticsInstance?.track.event(data);
    },
    pageView: (...rest: Partial<PageViewParameters>) => {
      analyticsInstance?.track.pageView({
        event: {
          title: window.document.title,
        },
        ...rest[0],
      });
    },
  };
};

export { AnalyticsContext, AnalyticsProvider };
