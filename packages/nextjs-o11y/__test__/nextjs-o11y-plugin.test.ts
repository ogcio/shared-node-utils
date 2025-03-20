import { describe, expect, it, vi } from "vitest";
import o11y, { ACCESS_CONTROL_EXPOSE_HEADERS, X_TRACE_ID } from "../src/index";

vi.mock("@opentelemetry/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@opentelemetry/api")>();
  return {
    ...actual,
    trace: {
      getActiveSpan: vi.fn(() => ({
        spanContext: vi.fn(() => ({
          traceId: "mock-trace-id",
        })),
      })),
    },
  };
});

describe("Verify X-Trace-Id", () => {
  it("should set the X_TRACE_ID header if a traceId exists", () => {
    const request = new Request("http://test");

    const response = new Response();
    response.headers.set("content-type", "application/json");

    o11y(request, response);

    expect(response.headers.has("x-trace-id"));
    expect(response.headers.get("x-trace-id")).toBe("mock-trace-id");
  });

  it("should set the X_TRACE_ID and enrich ACCESS_CONTROL_EXPOSE_HEADERS", () => {
    const request = new Request("http://test");

    const response = new Response();
    response.headers.set("content-type", "application/json");
    response.headers.set("access-control-request-headers", "content-type");

    o11y(request, response);

    expect(response.headers.has("x-trace-id"));
    expect(response.headers.get("x-trace-id")).toBe("mock-trace-id");

    expect(response.headers.has("access-control-request-headers"));
    expect(
      response.headers
        .get("access-control-request-headers")
        ?.includes("content-type"),
    );
    expect(
      response.headers
        .get("access-control-request-headers")
        ?.includes("x-trace-id"),
    );
  });

  it("should return if X_TRACE_ID already exists", () => {
    const request = new Request("http://test");

    const response = new Response();
    response.headers.set("content-type", "application/json");
    response.headers.set(
      ACCESS_CONTROL_EXPOSE_HEADERS,
      `content-type, ${X_TRACE_ID}`,
    );

    o11y(request, response);

    expect(response.headers.has("x-trace-id"));
    expect(response.headers.get("x-trace-id")).toBe("mock-trace-id");

    expect(response.headers.has("access-control-request-headers"));
    expect(
      response.headers
        .get("access-control-request-headers")
        ?.includes("content-type"),
    );
    expect(
      response.headers
        .get("access-control-request-headers")
        ?.includes("x-trace-id"),
    );
  });
});
