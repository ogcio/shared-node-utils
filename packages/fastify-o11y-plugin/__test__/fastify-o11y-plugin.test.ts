import { assert, afterEach, describe, expect, test, vi } from "vitest";
import { X_TRACE_ID } from "../src";
import { buildFastify } from "./build-fastify";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  getMetric: vi.fn().mockImplementation((type, options) => {
    // Validate the parameters
    assert.equal("counter", type);
    assert.isNotNull(options);
    assert.equal("http.server.responses", options.meterName);

    return { add: mocks.add };
  }),
}));

vi.mock("@ogcio/o11y-sdk-node", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ogcio/o11y-sdk-node")>();
  return {
    ...actual,
    getActiveSpan: vi.fn(() => ({
      spanContext: vi.fn(() => ({
        traceId: "mock-trace-id",
      })),
    })),
    getMetric: mocks.getMetric,
  };
});

describe("Verify X-Trace-Id", () => {
  test("response should contain header with mock value", async () => {
    const server = buildFastify();
    afterEach(() => server.close());

    const response = await server.inject({
      method: "GET",
      url: "/",
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    assert.equal(response.headers[X_TRACE_ID], "mock-trace-id");

    expect(mocks.add).toHaveBeenCalledWith(1, {
      status_code: 200,
    });
  });
});
