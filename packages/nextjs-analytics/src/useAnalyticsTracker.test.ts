import { renderHook } from "@testing-library/react";
import { type Mock, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalyticsClientProps } from "./types";
import { useAnalyticsTracker } from "./useAnalyticsTracker";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/test-path",
}));

const mockClient: AnalyticsClientProps = {
  initClientTracker: vi.fn().mockImplementation(() => Promise.resolve()),
  setTrackingContext: vi.fn(),
  // @ts-expect-error
  track: {
    event: vi.fn(),
    pageView: vi.fn(),
  },
};

describe("useAnalyticsTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize analytics with userId on mount", async () => {
    const userId = "test-user";

    renderHook(() => useAnalyticsTracker(mockClient)({ userId }));

    expect(mockClient.initClientTracker).toHaveBeenCalledWith({ userId });
  });

  it("should set tracking context with customDimensions", async () => {
    const customDimensions = { dimension1: "value1" };

    renderHook(() => useAnalyticsTracker(mockClient)({ customDimensions }));

    await new Promise((resolve) => process.nextTick(resolve));
    expect(mockClient.setTrackingContext).toHaveBeenCalledWith({
      customDimensions,
    });
  });

  it("should initialize only once", () => {
    const { rerender } = renderHook(() =>
      useAnalyticsTracker(mockClient)({ userId: "test-user" }),
    );

    rerender();
    rerender();

    expect(mockClient.initClientTracker).toHaveBeenCalledTimes(1);
  });

  it("should handle initialization errors silently", async () => {
    (mockClient.initClientTracker as Mock).mockRejectedValueOnce(
      new Error("Init failed"),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderHook(() => useAnalyticsTracker(mockClient)({ userId: "test-user" }));

    await new Promise((resolve) => process.nextTick(resolve));
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
