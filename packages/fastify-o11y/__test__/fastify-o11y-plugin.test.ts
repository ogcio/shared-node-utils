import cors, { type FastifyCorsOptions } from "@fastify/cors";
import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  afterAll,
  afterEach,
  assert,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { X_TRACE_ID } from "../src";
import { buildFastify } from "./build-fastify";
import * as sdkUtils from "@ogcio/o11y-sdk-node";
import { trace } from "@opentelemetry/api";

const mocks = vi.hoisted(() => ({
  add: vi.fn(),
  getMetric: vi.fn().mockImplementation((type, options) => {
    // Validate the parameters
    assert.equal("counter", type);
    assert.isNotNull(options);
    assert.equal("http.server.responses", options.meterName);

    return { add: mocks.add };
  }),
  addEvent: vi.fn(),
  recordException: vi.fn(),
}));

describe("Verify X-Trace-Id", () => {
  beforeAll(() => {
    const originalReturn = sdkUtils.getActiveSpan();

    vi.spyOn(sdkUtils, "getActiveSpan").mockImplementation(() => ({
      ...originalReturn,
      spanContext: vi.fn(() => ({
        ...originalReturn.spanContext(),
        traceId: "mock-trace-id",
        spanId: "mock-span-id",
      })),
    }));
    vi.mock("@ogcio/o11y-sdk-node", async (importOriginal) => {
      const actual =
        await importOriginal<typeof import("@ogcio/o11y-sdk-node")>();
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
  });

  afterAll(() => {
    vi.resetAllMocks();
    vi.restoreAllMocks();
  });

  it("response should contain header with mock value", async () => {
    const server = await buildFastify();

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

  it("response should contain all access control expose headers", async () => {
    const server = await buildFastify();

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

  it("cors config expose x-trace-id, plugin must skip header concatenation and response container exposed headers", async () => {
    const server = await buildFastify();

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

describe("Validation Errors", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("Validation Errors should be recorded in span", async () => {
    const server = await buildFastify();

    const testSpan = trace.getTracer("tests").startSpan("testSpan");
    const mockAttributes = {};
    const mockAddEvent = vi.fn();
    const mockSetAttribute = vi.fn((key, value) => {
      mockAttributes[key] = value;
      return testSpan;
    });
    const mockSetAttributes = vi.fn((attributes) => {
      Object.assign(mockAttributes, attributes);
      return testSpan;
    });
    vi.spyOn(sdkUtils, "getActiveSpan").mockImplementation(() => {
      return {
        ...testSpan,
        setAttribute: mockSetAttribute,
        setAttributes: mockSetAttributes,
        addEvent: mockAddEvent,
        recordException: mocks.recordException,
      };
    });
    const response = await server.inject({
      method: "POST",
      url: "/validation/id",
      body: {},
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 400);

    expect(mocks.recordException).toHaveBeenCalledTimes(1);
    expect(mockAddEvent).toHaveBeenCalledTimes(1);

    assert.equal(mockAddEvent.mock.calls[0][0], "validation_error_0");
    expect(mockAddEvent.mock.calls[0][1]).toHaveProperty("validation.field");
    expect(mockAddEvent.mock.calls[0][1]).toHaveProperty("validation.rule");
    expect(mockAddEvent.mock.calls[0][1]).toHaveProperty("validation.message");
    expect(mockAddEvent.mock.calls[0][1]).toHaveProperty(
      "validation.schema_path",
    );

    expect(mockAttributes).toHaveProperty("error.type", "validation_error");
    expect(mockAttributes).toHaveProperty("error.code");
    expect(mockAttributes).toHaveProperty("http.route");
    expect(mockAttributes).toHaveProperty("http.method");
    expect(mockAttributes).toHaveProperty("error.validation.failed", true);

    server.close();
  });

  it("Happy path shouldn't decorate span", async () => {
    const server = await buildFastify();

    const testSpan = trace.getTracer("tests").startSpan("testSpan");
    const mockAttributes = {};
    const mockAddEvent = vi.fn();
    const mockSetAttribute = vi.fn((key, value) => {
      mockAttributes[key] = value;
      return testSpan;
    });
    const mockSetAttributes = vi.fn((attributes) => {
      Object.assign(mockAttributes, attributes);
      return testSpan;
    });
    vi.spyOn(sdkUtils, "getActiveSpan").mockImplementation(() => {
      return {
        ...testSpan,
        setAttribute: mockSetAttribute,
        setAttributes: mockSetAttributes,
        addEvent: mockAddEvent,
        recordException: mocks.recordException,
      };
    });
    const response = await server.inject({
      method: "POST",
      url: "/validation/id",
      body: { id: "1234567890" },
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);

    expect(mocks.recordException).toHaveBeenCalledTimes(0);
    expect(mockAddEvent).toHaveBeenCalledTimes(0);

    server.close();
  });

  it("errorTracing can be disabled", async () => {
    const server = await buildFastify({
      traceErrors: false,
    });

    const testSpan = trace.getTracer("tests").startSpan("testSpan");
    const mockAttributes = {};
    const mockAddEvent = vi.fn();
    const mockSetAttribute = vi.fn((key, value) => {
      mockAttributes[key] = value;
      return testSpan;
    });
    const mockSetAttributes = vi.fn((attributes) => {
      Object.assign(mockAttributes, attributes);
      return testSpan;
    });
    vi.spyOn(sdkUtils, "getActiveSpan").mockImplementation(() => {
      return {
        ...testSpan,
        setAttribute: mockSetAttribute,
        setAttributes: mockSetAttributes,
        addEvent: mockAddEvent,
        recordException: mocks.recordException,
      };
    });
    const response = await server.inject({
      method: "POST",
      url: "/validation/id",
      body: {},
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 400);

    expect(mocks.recordException).toHaveBeenCalledTimes(0);
    expect(mockAddEvent).toHaveBeenCalledTimes(0);

    server.close();
  });
});
