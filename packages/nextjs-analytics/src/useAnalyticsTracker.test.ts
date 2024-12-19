import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./trackEvent";
import type { AnalyticsClientProps } from "./types";

const mockTrackEvent = vi.fn().mockResolvedValue({
  message: "success",
  status: 200,
});

const mockClient: AnalyticsClientProps = {
  // @ts-expect-error
  track: {
    event: mockTrackEvent,
    pageView: vi.fn(),
  },
  initClientTracker: vi.fn(),
  setTrackingContext: vi.fn(),
};

describe("trackEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track event with correct parameters", async () => {
    const testEvent = {
      action: "test-action",
      category: "test-category",
      name: "test-name",
      value: 1,
    };

    trackEvent(mockClient)({ event: testEvent });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: testEvent,
    });
  });

  it("should handle tracking errors silently", async () => {
    mockTrackEvent.mockRejectedValueOnce(new Error("Track failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    trackEvent(mockClient)({
      event: {
        action: "test-action",
        category: "test-category",
        name: "test-name",
        value: 1,
      },
    });

    await new Promise((resolve) => process.nextTick(resolve));

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
