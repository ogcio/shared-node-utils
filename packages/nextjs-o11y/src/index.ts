import { trace } from "@opentelemetry/api";

export const ACCESS_CONTROL_EXPOSE_HEADERS = "access-control-expose-headers";
export const X_TRACE_ID = "x-trace-id";

export default function o11y<
  HttpRequest extends Request,
  HttpResponse extends Response,
>(_req: HttpRequest, res: HttpResponse): void {
  try {
    const traceId = trace.getActiveSpan()?.spanContext()?.traceId;

    if (traceId) {
      res.headers.set(X_TRACE_ID, traceId);
    }

    const exposedHeaders = res.headers.get(ACCESS_CONTROL_EXPOSE_HEADERS);

    if (!exposedHeaders) {
      res.headers.set(ACCESS_CONTROL_EXPOSE_HEADERS, X_TRACE_ID);
      return;
    }

    if (exposedHeaders.toString().includes(X_TRACE_ID)) {
      return;
    }

    res.headers.set(
      ACCESS_CONTROL_EXPOSE_HEADERS,
      `${X_TRACE_ID}, ${exposedHeaders}`,
    );
  } catch (error) {
    console.error("Observability Middleware Error:", error);
  }
}
