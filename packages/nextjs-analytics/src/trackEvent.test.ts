import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./trackEvent";
import type { Analytics } from "@ogcio/analytics-sdk";

const mockTrackEvent = vi.fn().mockResolvedValue({
  message: "success",
  status: 200,
});

const mockClient: Partial<Analytics> = {
  // @ts-expect-error
  track: {
    event: mockTrackEvent,
  },
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

    // @ts-expect-error
    trackEvent(mockClient)({ event: testEvent });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: testEvent,
    });
  });

  it("should handle tracking errors silently", async () => {
    mockTrackEvent.mockRejectedValueOnce(new Error("Track failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // @ts-expect-error
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
