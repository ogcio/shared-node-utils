import cors, { type FastifyCorsOptions } from "@fastify/cors";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { assert, describe, expect, test, vi } from "vitest";
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

    server.close();
  });

  test("response should contain all access control expose headers", async () => {
    const server = buildFastify();

    server.register(cors, (_app: FastifyInstance) => {
      return (
        _req: FastifyRequest,
        callback: (
          error: Error | null,
          corsOptions?: FastifyCorsOptions,
        ) => void,
      ) => {
        const corsOptions: FastifyCorsOptions = {
          origin: (_origin, cb) => {
            cb(null, true);
          },
          exposedHeaders: ["Content-Type", "Custom-Header"],
        };

        callback(null, corsOptions);
      };
    });

    const response = await server.inject({
      method: "GET",
      url: "/",
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    assert.equal(response.headers[X_TRACE_ID], "mock-trace-id");
    assert.isNotNull(response.headers["access-control-request-headers"]);

    const expectedAccessHeaders = response.headers[
      "access-control-expose-headers"
    ]
      ?.split(",")
      .map((h) => h.trim());

    // verify cors exposed headers has been propagated
    assert.isNotEmpty(expectedAccessHeaders);
    if (expectedAccessHeaders) {
      assert.equal(expectedAccessHeaders[0], "Content-Type");
      assert.equal(expectedAccessHeaders[1], "Custom-Header");
    }

    expect(mocks.add).toHaveBeenCalledWith(1, {
      status_code: 200,
    });

    server.close();
  });

  test("cors config expose x-trace-id, plugin must skip header concatenation and response container exposed headers", async () => {
    const server = buildFastify();

    server.register(cors, (_app: FastifyInstance) => {
      return (
        _req: FastifyRequest,
        callback: (
          error: Error | null,
          corsOptions?: FastifyCorsOptions,
        ) => void,
      ) => {
        const corsOptions: FastifyCorsOptions = {
          origin: (_origin, cb) => {
            cb(null, true);
          },
          exposedHeaders: ["Content-Type", "Custom-Header", X_TRACE_ID],
        };

        callback(null, corsOptions);
      };
    });

    const response = await server.inject({
      method: "GET",
      url: "/",
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    assert.equal(response.headers[X_TRACE_ID], "mock-trace-id");
    assert.isNotNull(response.headers["access-control-request-headers"]);

    const expectedAccessHeaders = response.headers[
      "access-control-expose-headers"
    ]
      ?.split(",")
      .map((h) => h.trim());

    // verify cors exposed headers has been propagated
    assert.isNotEmpty(expectedAccessHeaders);

    if (expectedAccessHeaders) {
      assert.equal(expectedAccessHeaders[0], "Content-Type");
      assert.equal(expectedAccessHeaders[1], "Custom-Header");
      assert.equal(expectedAccessHeaders[2], X_TRACE_ID);
    }

    expect(mocks.add).toHaveBeenCalledWith(1, {
      status_code: 200,
    });

    server.close();
  });
});
