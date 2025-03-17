import { getActiveSpan, getMetric } from "@ogcio/o11y-sdk-node";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";

const httpResponsesCounter = getMetric<"counter", { status_code: number }>(
  "counter",
  {
    meterName: "http.server.responses",
    metricName: "http.server.responses",
  },
);

export const X_TRACE_ID = "x-trace-id";

export default fp(
  async (server: FastifyInstance) => {
    server.addHook("onRequest", (_request, reply, done) => {
      try {
        const traceId = getActiveSpan()?.spanContext()?.traceId;

        if (traceId) {
          reply.header(X_TRACE_ID, traceId);
        }
      } finally {
        done();
      }
    });

    server.addHook("onResponse", (_request, reply, done) => {
      try {
        httpResponsesCounter.add(1, { status_code: reply.statusCode });

        if (reply.getHeader(ACCESS_CONTROL_EXPOSE_HEADERS)) {
          reply.header(
            ACCESS_CONTROL_EXPOSE_HEADERS,
            `${X_TRACE_ID}, ${reply.getHeader(ACCESS_CONTROL_EXPOSE_HEADERS)}`,
          );
        } else {
          reply.header(ACCESS_CONTROL_EXPOSE_HEADERS, X_TRACE_ID);
        }
      } finally {
        done();
      }
    });
  },
  {
    fastify: "5.x",
    name: "@ogcio/fastify-o11y-plugin",
  },
);
