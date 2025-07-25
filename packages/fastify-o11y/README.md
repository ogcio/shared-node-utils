# Fastify Observability Plugin

This Fastify plugin enhances observability by:

- Attaching the `x-trace-id` header to responses using OpenTelemetry tracing.
- Recording HTTP response metrics with a counter.

## Installation

Ensure you have Fastify and `@ogcio/o11y-sdk-node` installed in your project with version >= `0.1.0-beta.8`

```sh
npm install fastify @ogcio/o11y-sdk-node @ogcio/fastify-o11y
```

## Usage

Import and register the plugin in your Fastify server:

```ts
import fastify from "fastify";
import observabilityPlugin from "@ogcio/fastify-o11y";

const app = fastify();

app.register(observabilityPlugin);

app.get("/", async () => {
  return { message: "Hello, world!" };
});

app.listen({ port: 3000 }, () => {
  console.log("Server running on http://localhost:3000");
});
```

## Features

### 1. Trace ID Propagation

This plugin adds the `x-trace-id` header to responses, extracted from the active OpenTelemetry span.

### 2. HTTP Response Metrics

The plugin uses `getMetric` to track HTTP response counts, recording status codes:

```ts
const httpResponsesCounter = getMetric<"counter", { status_code: number }>(
  "counter",
  {
    meterName: "http.server.responses",
    metricName: "http.server.responses",
  }
);
```

Each request updates the counter in the `onResponse` hook:

```ts
server.addHook("onResponse", (_request, reply, done) => {
  try {
    httpResponsesCounter.add(1, { status_code: reply.statusCode });
  } finally {
    done();
  }
});
```

### 3. Error Tracing

The plugin traces errors by default using an `onError` hook:

- Annotates OpenTelemetry spans with error and route details (error type, error code, route, method).
- Adds validation error info (field, rule, message, schema path) if present.
- Marks the span as error.
- No PII is traced.

Disable through the plugin config by explicitly setting `traceErrors` to false:
```ts
app.register(observabilityPlugin, { traceErrors: false });
```

## How It Works

1. **`onRequest` Hook**: Extracts the trace ID and attaches it to the response headers.
2. **`onResponse` Hook**: Increments the HTTP response counter with the response status code.
3. **`onError` Hook**: Extracts error info from FastifyError and injects them in current active span as spanAttributes, events, and exception.
