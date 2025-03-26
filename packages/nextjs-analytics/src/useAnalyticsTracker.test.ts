import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AnalyticsTracker } from "./AnalyticsTracker";
import type { AnalyticsConfigProps } from "./types";

const mockInitClientTracker = vi.fn().mockResolvedValue(undefined);
const mockSetTrackingContext = vi.fn();
const mockTrackPageView = vi.fn();

// Mock BBClient
vi.mock("./client", () => ({
  AnalyticsClient: () => ({
      initClientTracker: mockInitClientTracker,
      setTrackingContext: mockSetTrackingContext,
      track: {
        pageView: mockTrackPageView,
      },
  }),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/test-path",
}));

describe("AnalyticsTracker", () => {
  const validConfig: AnalyticsConfigProps = {
    baseUrl: "https://api.example.com",
    organizationId: "org-123",
    dryRun: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize analytics with userId on mount", () => {
    const userId = "test-user";

    renderHook(() =>
      AnalyticsTracker({
        config: validConfig,
        userId,
        pathname: "/test-path",
      }),
    );

    expect(mockInitClientTracker).toHaveBeenCalled();
  });

  it("should set tracking context with customDimensions", async () => {
    const customDimensions = { dimension1: "value1" };
    const userId = "test-user";

    renderHook(() =>
      AnalyticsTracker({
        config: validConfig,
        customDimensions,
        userId,
        pathname: "/test-path",
      }),
    );

    await new Promise((resolve) => process.nextTick(resolve));
    expect(mockSetTrackingContext).toHaveBeenCalledWith({
      customDimensions,
      userId,
    });
  });

  it("should initialize only once", () => {
    const { rerender } = renderHook(() =>
      AnalyticsTracker({
        config: validConfig,
        userId: "test-user",
        pathname: "/test-path",
      }),
    );

    rerender();
    rerender();

    expect(mockInitClientTracker).toHaveBeenCalledTimes(1);
  });

  it("should handle initialization errors silently", async () => {
    mockInitClientTracker.mockRejectedValueOnce(new Error("Init failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() =>
      AnalyticsTracker({
        config: validConfig,
        userId: "test-user",
        pathname: "/test-path",
      }),
    );

    await new Promise((resolve) => process.nextTick(resolve));
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
