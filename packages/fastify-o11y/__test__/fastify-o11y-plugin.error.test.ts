import { assert, describe, test, vi, expect, afterAll } from "vitest";
import { X_TRACE_ID } from "../src";
import { buildFastify } from "./build-fastify";
import * as sdkUtils from "@ogcio/o11y-sdk-node";

const mocks = vi.hoisted(() => ({
  add: vi.fn(() => {
    throw new Error("Add Error");
  }),
  getMetric: vi.fn().mockImplementation((_type, _options) => {
    return { add: mocks.add };
  }),
}));

vi.mock("@ogcio/o11y-sdk-node", () => ({
  getActiveSpan: vi.fn(() => ({
    spanContext: vi.fn(() => {
      throw new Error("Context Error");
    }),
    recordException: vi.fn(() => {
      throw new Error("RecordException Error");
    }),
  })),
  getMetric: mocks.getMetric,
}));

describe("Verify Errors", () => {
  afterAll(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  test("server should return response without X-Trace-Id header", async () => {
    const server = await buildFastify();

    vi.mock("@ogcio/o11y-sdk-node", () => ({
      getActiveSpan: vi.fn(() => ({
        spanContext: vi.fn(() => {
          throw new Error("Context Error");
        }),
      })),
      getMetric: mocks.getMetric,
    }));

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

    server.close();
  });

  test("server should return validation error without enriching span", async () => {
    const server = await buildFastify();

    vi.spyOn(sdkUtils, "getActiveSpan").mockImplementation(() => {
      throw new Error("RecordException Error");
    });

    const response = await server.inject({
      method: "POST",
      url: "/validation/id",
      body: {},
    });
    assert.ok(typeof response !== "undefined");

    // expect 400 without any blocker from o11y
    assert.equal(response?.statusCode, 400);

    server.close();
  });
});
