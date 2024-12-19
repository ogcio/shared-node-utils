import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAVIGATION_EVENT_CATEGORY, NAVIGATION_EVENT_NAME } from ".";
import { trackNavigationEvent } from "./trackNavigationEvent";
import type { AnalyticsClientProps } from "./types";

const mockTrackEvent = vi.fn();

vi.mock("./trackEvent", () => ({
  trackEvent: () => mockTrackEvent,
}));

const mockClient: AnalyticsClientProps = {
  // @ts-expect-error
  track: {
    event: vi.fn(),
    pageView: vi.fn(),
  },
  initClientTracker: vi.fn(),
  setTrackingContext: vi.fn(),
};

describe("trackNavigationEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track navigation event with correct parameters", () => {
    const pathname = "/test-path";

    trackNavigationEvent(mockClient)({ pathname });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: {
        action: pathname,
        category: NAVIGATION_EVENT_CATEGORY,
        name: NAVIGATION_EVENT_NAME,
        value: 1,
      },
    });
  });
});
