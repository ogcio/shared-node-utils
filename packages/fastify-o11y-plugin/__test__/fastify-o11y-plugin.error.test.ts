import { assert, afterEach, describe, test, vi } from "vitest";
import { buildFastify } from "./build-fastify";
import { X_TRACE_ID } from "../src";

vi.mock("@ogcio/o11y-sdk-node", () => ({
  getActiveSpan: vi.fn(() => ({
    spanContext: vi.fn(() => {
      throw new Error("Wanted Error");
    }),
  })),
}));

describe("Verify Errors", () => {
  test("server should return response without X-Trace-Id header", async () => {
    const server = buildFastify();
    afterEach(() => server.close());

    const response = await server.inject({
      method: "GET",
      url: "/",
    });
    assert.ok(typeof response !== "undefined");
    // expect 200 without any blocker from o11y
    assert.equal(response?.statusCode, 200);
    // verify header not present
    assert.equal(response.headers[X_TRACE_ID], undefined);
  });
});
