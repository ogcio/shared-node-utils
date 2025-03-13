import { getActiveSpan, getMetric } from "@ogcio/o11y-sdk-node";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export const X_TRACE_ID = "x-trace-id";

const httpResponsesCounter = getMetric<"counter", { status_code: number }>(
  "counter",
  {
    meterName: "http.server.responses",
    metricName: "http.server.responses",
  }
);

export default fp(async (server: FastifyInstance) => {
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
    } finally {
      done();
    }
  });
});
