import { beforeEach, describe, expect, it, vi } from "vitest";
import { trackEvent } from "./trackEvent";
import type { AnalyticsConfigProps } from "./types";

const mockTrackEvent = vi.fn().mockResolvedValue(undefined);
const mockBBClient = vi.fn().mockReturnValue({
  analytics: {
    track: {
      event: mockTrackEvent,
    },
  },
});

vi.mock(".", () => ({
  BBClient: (config: AnalyticsConfigProps) => mockBBClient(config),
}));

describe("trackEvent", () => {
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
    trackEvent(validConfig)({
      event: {
        action: "test-action",
        category: "test-category",
        name: "test-name",
        value: 1,
      },
    });

    expect(mockBBClient).toHaveBeenCalledWith(validConfig);
  });

  it("should track event with correct parameters", async () => {
    const testEvent = {
      action: "test-action",
      category: "test-category",
      name: "test-name",
      value: 1,
    };

    trackEvent(validConfig)({ event: testEvent });

    expect(mockTrackEvent).toHaveBeenCalledWith({
      event: testEvent,
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

    const testEvent = {
      action: "test-action",
      category: "test-category",
      name: "test-name",
      value: 1,
    };

    trackEvent(minimalConfig)({ event: testEvent });

    expect(mockBBClient).toHaveBeenCalledWith(minimalConfig);
  });

  it("should handle tracking errors silently", async () => {
    mockTrackEvent.mockRejectedValueOnce(new Error("Track failed"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    trackEvent(validConfig)({
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
