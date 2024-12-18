import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsConfigProps } from "./types";
import { useAnalyticsTracker } from "./useAnalyticsTracker";

vi.mock("next/navigation", () => ({
  usePathname: () => "/test-path",
}));

const mockInitClientTracker = vi.fn().mockResolvedValue(undefined);
const mockSetTrackingContext = vi.fn();
const mockTrackPageView = vi.fn().mockResolvedValue(undefined);

const mockBBClient = vi.fn().mockReturnValue({
  analytics: {
    initClientTracker: mockInitClientTracker,
    setTrackingContext: mockSetTrackingContext,
    track: {
      pageView: mockTrackPageView,
    },
  },
});

vi.mock(".", () => ({
  BBClient: (config: AnalyticsConfigProps) => mockBBClient(config),
}));

let currentPath = "/test-path";
vi.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

describe("useAnalyticsTracker", () => {
  const validConfig: AnalyticsConfigProps = {
    baseUrl: "https://api.example.com",
    trackingWebsiteId: "web-123",
    organizationId: "org-123",
    dryRun: false,
    applicationId: "app-123",
    applicationSecret: "secret-123",
    logtoOidcEndpoint: "https://auth.example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize BBClient with correct config", () => {
    renderHook(() => useAnalyticsTracker(validConfig)({}));

    expect(mockBBClient).toHaveBeenCalledWith(validConfig);
    expect(mockBBClient).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://api.example.com",
        trackingWebsiteId: "web-123",
        organizationId: "org-123",
        dryRun: false,
        applicationId: "app-123",
        applicationSecret: "secret-123",
        logtoOidcEndpoint: "https://auth.example.com",
      }),
    );
  });

  it("should initialize analytics with userId", () => {
    const userId = "test-user-123";

    renderHook(() => useAnalyticsTracker(validConfig)({ userId }));

    expect(mockInitClientTracker).toHaveBeenCalledWith({ userId });
  });

  it("should set tracking context with complex customDimensions", async () => {
    const customDimensions = {
      dimension1: "value1",
      dimension2: "value2",
      dimension10: "value10",
    };

    renderHook(() => useAnalyticsTracker(validConfig)({ customDimensions }));

    // Wait for initClientTracker promise to resolve
    await new Promise(process.nextTick);

    expect(mockSetTrackingContext).toHaveBeenCalledWith({ customDimensions });
  });

  it("should work with minimal config (optional trackingWebsiteId)", () => {
    const minimalConfig: AnalyticsConfigProps = {
      baseUrl: "https://api.example.com",
      organizationId: "org-123",
      dryRun: false,
      applicationId: "app-123",
      applicationSecret: "secret-123",
      logtoOidcEndpoint: "https://auth.example.com",
    };

    renderHook(() => useAnalyticsTracker(minimalConfig)({}));

    expect(mockBBClient).toHaveBeenCalledWith(minimalConfig);
  });

  it("should track page view with correct pathname", async () => {
    const { rerender } = renderHook(() => useAnalyticsTracker(validConfig)({}));

    // First render - should not track (initial load)
    expect(mockTrackPageView).not.toHaveBeenCalled();

    // Change pathname and trigger re-render
    currentPath = "/new-path";
    rerender();

    await new Promise((resolve) => process.nextTick(resolve));

    expect(mockTrackPageView).toHaveBeenCalledWith({
      event: { title: currentPath },
    });
  });

  it("should maintain initialization state across re-renders", () => {
    const { rerender } = renderHook(() =>
      useAnalyticsTracker(validConfig)({ userId: "test-user" }),
    );

    expect(mockInitClientTracker).toHaveBeenCalledTimes(1);

    rerender();
    rerender();

    expect(mockInitClientTracker).toHaveBeenCalledTimes(1);
  });

  it("should handle errors gracefully", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockInitClientTracker.mockRejectedValueOnce(new Error("Init failed"));
    mockTrackPageView.mockRejectedValueOnce(new Error("Track failed"));

    const { rerender } = renderHook(() =>
      useAnalyticsTracker(validConfig)({ userId: "test-user" }),
    );

    rerender(); // Trigger page view tracking

    // Verify error handling doesn't break the hook
    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
