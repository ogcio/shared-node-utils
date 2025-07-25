import { getActiveSpan, getMetric } from "@ogcio/o11y-sdk-node";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import type { FastifySchemaValidationError } from "fastify/types/schema.js";
import { SpanStatusCode } from "@opentelemetry/api";

export type PluginConfig = {
  traceErrors?: boolean;
};

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
  async (server: FastifyInstance, pluginConfig: PluginConfig = {}) => {
    server.addHook("onRequest", (_request, reply, done) => {
      try {
        const traceId = getActiveSpan()?.spanContext()?.traceId;

        if (traceId) {
          reply.header(X_TRACE_ID, traceId);
        }
      } catch (_nonCriticalError) {
      } finally {
        done();
      }
    });

    server.addHook("onResponse", (_request, reply, done) => {
      try {
        httpResponsesCounter.add(1, { status_code: reply.statusCode });

        if (reply.getHeader(ACCESS_CONTROL_EXPOSE_HEADERS)) {
          // x-trace-id header is already exposed, exit
          if (
            reply
              .getHeader(ACCESS_CONTROL_EXPOSE_HEADERS)
              ?.toString()
              .includes(X_TRACE_ID)
          ) {
            return done();
          }

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

    if (pluginConfig.traceErrors !== false) {
      server.addHook("onError", async (_request, _reply, error) => {
        try {
          const span = getActiveSpan();

          if (span) {
            // Add validation error attributes without PII
            span.setAttributes({
              "error.type": "error",
              "error.code": error.statusCode,
              "http.route": _request.routeOptions.url,
              "http.method": _request.method,
            });

            if (error.validation) {
              span.setAttributes({
                "error.type": "validation_error",
                "error.validation.failed": true,
              });

              const validationDetails = error.validation.map(
                (validationError: FastifySchemaValidationError) => ({
                  field: validationError.instancePath || "root",
                  rule: validationError.keyword,
                  schemaPath: validationError.schemaPath,
                  message: validationError.message ?? error.message,
                }),
              );

              validationDetails.forEach((detail, index) => {
                span.addEvent(`validation_error_${index}`, {
                  "validation.field": detail.field,
                  "validation.rule": detail.rule,
                  "validation.message": detail.message,
                  "validation.schema_path": detail.schemaPath,
                });
              });
            }

            span.recordException(error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: "Request failed",
            });
          }
        } catch (_nonCriticalError) {}
      });
    }
  },
  {
    fastify: "5.x",
    name: "@ogcio/fastify-o11y",
  },
);
