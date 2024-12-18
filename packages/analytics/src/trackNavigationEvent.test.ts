import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackNavigationEvent } from "./trackNavigationEvent";
import type { AnalyticsConfigProps } from "./types";

const mockTrackEvent = vi.fn().mockResolvedValue(undefined);

const mockBBClient = vi.fn().mockReturnValue({
  analytics: {
    track: {
      event: mockTrackEvent,
    },
  },
});

vi.mock("./client", () => ({
  BBClient: (config: AnalyticsConfigProps) => mockBBClient(config),
}));

describe("trackNavigationEvent", () => {
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
    trackNavigationEvent(validConfig)({ pathname: "/test" });

    expect(mockBBClient).toHaveBeenCalledWith(validConfig);
  });

  it("should track navigation event with correct parameters", async () => {
    const pathname = "/test-path";

    trackNavigationEvent(validConfig)({ pathname });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: {
        action: pathname,
        category: "NAVIGATION",
        name: "Route_Request",
        value: 1,
      },
    });
  });

  it("should work with minimal config", () => {
    const minimalConfig: AnalyticsConfigProps = {
      baseUrl: "https://api.example.com",
      organizationId: "org-123",
      dryRun: false,
      applicationId: "app-123",
      applicationSecret: "secret-123",
      logtoOidcEndpoint: "https://auth.example.com",
    };

    trackNavigationEvent(minimalConfig)({ pathname: "/test" });

    expect(mockBBClient).toHaveBeenCalledWith(minimalConfig);
  });

  it("should handle tracking errors silently", async () => {
    const error = new Error("Track failed");
    mockTrackEvent.mockRejectedValueOnce(error);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    trackNavigationEvent(validConfig)({ pathname: "/test" });

    await new Promise((resolve) => process.nextTick(resolve));

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
