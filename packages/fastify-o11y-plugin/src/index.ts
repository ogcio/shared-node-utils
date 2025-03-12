import { getActiveSpan } from "@ogcio/o11y-sdk-node";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

export const X_TRACE_ID = "x-trace-id";

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
});
