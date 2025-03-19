# Next Observability Plugin

This javascript plugin enhances observability by:

- Attaching the `x-trace-id` header to responses using OpenTelemetry tracing.

## Installation

Ensure you have `@opentelemetry/api` installed in your project with version >= `1.x`

```sh
npm install fastify @ogcio/nextjs-o11y-plugin
```

## Usage

Ensure you have the `instrumentation.ts` file in your application with node and edge instrumentation ready.

```ts
import { registerOTel } from "@vercel/otel";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    import("@ogcio/o11y-sdk-node").then(async (sdk) => {
      sdk.instrumentNode({
        serviceName: "service-name",
        collectorUrl: "http:your-otel-collector-url",
      });
    });
  } else {
    registerOTel();
  }
}
```

Import and register the plugin in NextJS your `middleware.ts`:

```ts
import o11y from "@ogcio/nextjs-o11y-plugin";

export default async function (request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  o11y(request, response);

  return response;
}
```

## Features

### 1. Trace ID Propagation

This plugin adds the `x-trace-id` header to responses, extracted from the active OpenTelemetry span.
