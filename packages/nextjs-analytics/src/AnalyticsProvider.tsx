"use client";

import {
  Analytics,
  type AnalyticsOptions,
  ConsoleLogger,
} from "@ogcio/analytics-sdk";
import { usePathname, useSearchParams } from "next/navigation";
import { createContext, useContext, useEffect, useMemo } from "react";

type AnalyticsClientSideOptions = Omit<AnalyticsOptions, "getTokenFn">;

type AnalyticsContextValue = {
  analyticsInstance?: Analytics;
};

const AnalyticsContext = createContext<AnalyticsContextValue>({
  analyticsInstance: undefined,
});

let analytics: Analytics;
function getAnalytics(analyticsConfig: AnalyticsClientSideOptions) {
  if (analytics) return analytics;

  if (!analyticsConfig.logger) {
    analyticsConfig.logger = new ConsoleLogger({
      level: "warn",
    });
  }

  analytics = new Analytics(analyticsConfig);

  return analytics;
}

const AnalyticsProvider = ({
  config,
  children,
}: {
  config: AnalyticsClientSideOptions;
  children: React.ReactNode;
}) => {
  const context = useMemo(() => {
    return {
      analyticsInstance: getAnalytics(config),
    };
  }, [config]);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Defer DOM operations until after hydration
  useEffect(() => {
    const initializeAnalytics = async () => {
      if (typeof window !== "undefined" && context.analyticsInstance) {
        try {
          await context.analyticsInstance.initClientTracker({
            trackPageView: false,
          });
        } catch (e) {
          console.error("Analytics: Error during init", e);
        }
      }
    };

    initializeAnalytics();
  }, [context.analyticsInstance]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: although pathname and searchParams are not used within the hook, they determine a navigation event that we want to track
  useEffect(() => {
    if (context.analyticsInstance?.isInitialized()) {
      try {
        context.analyticsInstance.track.pageView({
          event: {
            title: window.document.title,
          },
        });
      } catch (e) {
        console.error("Analytics: Error during route change", e);
      }
    }
  }, [context.analyticsInstance, pathname, searchParams]);

  return (
    <AnalyticsContext.Provider value={context}>
      {children}
    </AnalyticsContext.Provider>
  );
};

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
