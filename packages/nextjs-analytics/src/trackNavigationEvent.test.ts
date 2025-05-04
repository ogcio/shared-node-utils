import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackNavigationEvent } from "./trackNavigationEvent";
import type { Analytics } from "@ogcio/analytics-sdk";

const mockTrackPageView = vi.fn().mockResolvedValue({
  message: "success",
  status: 200,
});

const mockClient: Partial<Analytics> = {
  // @ts-expect-error
  track: {
    pageView: mockTrackPageView,
  },
};

describe("trackNavigationEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track event with correct parameters", async () => {
    const testEvent = {
      pathname: "/test-path",
      title: "Test Title",
    };

    // @ts-expect-error
    trackNavigationEvent(mockClient)(testEvent);

    expect(mockTrackPageView).toHaveBeenCalledWith({
      event: {
        title: testEvent.title,
      },
      metadataOverride: {
        url: testEvent.pathname,
      },
    });
  });

  it("should handle tracking errors silently", async () => {
    mockTrackPageView.mockRejectedValueOnce(new Error("Track failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // @ts-expect-error
    trackNavigationEvent(mockClient)({
      pathname: "/test-path",
      title: "Test Title",
    });

    await new Promise((resolve) => process.nextTick(resolve));

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
