import { assert, afterEach, describe, test, vi, expect } from "vitest";
import { X_TRACE_ID } from "../src";
import { buildFastify } from "./build-fastify";

const mocks = vi.hoisted(() => ({
  add: vi.fn(() => {
    throw new Error("Wanted Error");
  }),
  getMetric: vi.fn().mockImplementation((_type, _options) => {
    return { add: mocks.add };
  }),
}));

vi.mock("@ogcio/o11y-sdk-node", () => ({
  getActiveSpan: vi.fn(() => ({
    spanContext: vi.fn(() => {
      throw new Error("Wanted Error");
    }),
  })),
  getMetric: mocks.getMetric,
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

    expect(mocks.add).toHaveBeenCalledWith(1, {
      status_code: 200,
    });
  });
});
