import { assert, afterEach, describe, test, vi } from "vitest";
import { buildFastify } from "./build-fastify";
import { X_TRACE_ID } from "../src";

vi.mock("@ogcio/o11y-sdk-node", () => ({
  getActiveSpan: vi.fn(() => ({
    spanContext: vi.fn(() => ({
      traceId: "mock-trace-id",
    })),
  })),
}));

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
  });
});
