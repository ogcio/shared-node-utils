import React, { useEffect } from "react";
import { render, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { AnalyticsProvider, useAnalytics } from "./AnalyticsProvider"; // adjust path as needed
import type { AnalyticsOptions } from "@ogcio/analytics-sdk";

const isInitialized = vi.fn().mockReturnValue(true);

vi.mock("@ogcio/analytics-sdk", () => {
  const initClientTracker = vi.fn().mockResolvedValue(undefined);
  const trackPageView = vi.fn();
  const trackEvent = vi.fn();
  const setTrackingContext = vi.fn();
  const ConsoleLogger = vi.fn().mockImplementation(() => ({
    setLevel: vi.fn(),
  }));

  const MockAnalytics = vi.fn().mockImplementation(() => ({
    initClientTracker,
    track: {
      pageView: trackPageView,
      event: trackEvent,
    },
    setTrackingContext,
    isInitialized,
  }));

  return {
    ConsoleLogger,
    Analytics: MockAnalytics,
    __esModule: true,
    __mocks__: {
      MockAnalytics,
      initClientTracker,
      trackPageView,
      trackEvent,
      setTrackingContext,
    },
  };
});

// Re-import mocks after vi.mock hoisting
// @ts-expect-error: accessing mock internals for testing
import { __mocks__ } from "@ogcio/analytics-sdk";
const {
  MockAnalytics,
  initClientTracker,
  trackPageView,
  trackEvent,
  setTrackingContext,
} = __mocks__;

describe("AnalyticsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  test("calls initClientTracker and pageView on mount", async () => {
    const config: AnalyticsOptions = {
      baseUrl: "https://example.com",
      organizationId: "test-org",
      trackingWebsiteId: "test-website",
      dryRun: false,
    };

    await act(async () => {
      render(
        <AnalyticsProvider config={config}>
          <div>Test</div>
        </AnalyticsProvider>
      );
    });

    expect(MockAnalytics).toHaveBeenCalledWith(config);
    expect(initClientTracker).toHaveBeenCalledWith({ trackPageView: false });

    await act(() => Promise.resolve()); // Wait for .then
    expect(trackPageView).toHaveBeenCalledWith({
      event: {
        title: document.title,
      },
    });
  });

  test("useAnalytics hook calls trackEvent and pageView", async () => {
    const config: AnalyticsOptions = {
      baseUrl: "https://example.com",
      organizationId: "test-org",
      trackingWebsiteId: "test-website",
      dryRun: false,
    };

    const TestComponent = () => {
      const { trackEvent, pageView } = useAnalytics();

      useEffect(() => {
        trackEvent({ event: { category: "interactions", action: "click" } });
        pageView({ event: { title: "Test Page" } });
      }, [trackEvent, pageView]);

      return <div>Hook Test</div>;
    };

    await act(async () => {
      render(
        <AnalyticsProvider config={config}>
          <TestComponent />
        </AnalyticsProvider>
      );
    });

    expect(trackEvent).toHaveBeenCalledWith({
      event: { category: "interactions", action: "click" },
    });

    expect(trackPageView).toHaveBeenCalledWith({
      event: {
        title: document.title,
      },
    });
  });

  test("useAnalytics sets and resets tracking context", async () => {
    const config: AnalyticsOptions = {
      baseUrl: "https://example.com",
      organizationId: "test-org",
      trackingWebsiteId: "test-website",
      dryRun: false,
    };

    const TestComponent = () => {
      useAnalytics({
        contextOverride: { customDimensions: { dimension1: "test dimension" } },
      });

      return <div>Context Test</div>;
    };

    const { unmount } = render(
      <AnalyticsProvider config={config}>
        <TestComponent />
      </AnalyticsProvider>
    );

    expect(setTrackingContext).toHaveBeenCalledWith({
      customDimensions: { dimension1: "test dimension" },
    });

    unmount();

    expect(setTrackingContext).toHaveBeenCalledWith({});
  });

  test("handles error when initClientTracker fails", async () => {
    const config: AnalyticsOptions = {
      baseUrl: "https://example.com",
      organizationId: "test-org",
      trackingWebsiteId: "test-website",
      dryRun: false,
    };

    isInitialized.mockReturnValueOnce(false);

    initClientTracker.mockRejectedValueOnce(
      new Error("initClientTracker error")
    );

    await act(async () => {
      render(
        <AnalyticsProvider config={config}>
          <div>Test</div>
        </AnalyticsProvider>
      );
    });

    expect(initClientTracker).toHaveBeenCalledWith({ trackPageView: false });
    expect(trackPageView).not.toHaveBeenCalled();
  });

  test("handles error when track.pageView fails", async () => {
    const config: AnalyticsOptions = {
      baseUrl: "https://example.com",
      organizationId: "test-org",
      trackingWebsiteId: "test-website",
      dryRun: false,
    };

    trackPageView.mockImplementationOnce(() => {
      throw new Error("track.pageView error");
    });

    isInitialized.mockReturnValueOnce(false);

    await act(async () => {
      render(
        <AnalyticsProvider config={config}>
          <div>Test</div>
        </AnalyticsProvider>
      );
    });

    expect(initClientTracker).toHaveBeenCalledWith({ trackPageView: false });
    expect(trackPageView).not.toHaveBeenCalledWith({
      event: {
        title: document.title,
      },
    });
  });
});
