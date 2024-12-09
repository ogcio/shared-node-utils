import { hostname } from "os";
import type { HttpError } from "@fastify/sensible";
import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import type { LogLevel, PinoLoggerOptions } from "fastify/types/logger.js";
import {
  type FullLoggingRequest,
  type LoggingContext,
  type LoggingError,
  type LoggingRequest,
  type LoggingResponse,
  MESSAGE_KEY,
  REDACTED_PATHS,
  REDACTED_VALUE,
  toLoggingError,
} from "./logging-wrapper-entities.js";

const loggingContext: LoggingContext = {};

type INPUT_ERROR_TYPES = FastifyError | HttpError;

export const getLoggingContext = (params: {
  includeError: boolean;
}): LoggingContext =>
  params.includeError
    ? loggingContext
    : { ...loggingContext, error: undefined };

export const setLoggingContext = (params: {
  request?: FastifyRequest;
  response?: FastifyReply;
  error?: INPUT_ERROR_TYPES;
}): void => {
  if (params.request !== undefined) {
    loggingContext.request = parseLoggingRequest(params.request);
  }
  if (params.response !== undefined) {
    loggingContext.response = parseLoggingResponse(params.response);
  }
  if (params.error !== undefined) {
    loggingContext.error = toLoggingError(params.error);
  }
};

export const resetLoggingContext = (): void => {
  loggingContext.request = undefined;
  loggingContext.response = undefined;
  loggingContext.error = undefined;
};

export const getLoggingContextError = (): LoggingError | undefined =>
  getLoggingContext({ includeError: true }).error;

export const getPartialLoggingContextError = ():
  | Omit<LoggingError, "trace">
  | undefined => ({
  ...(getLoggingContext({ includeError: true }).error ?? {}),
  trace: undefined,
});

const getPathWithoutParams = (req: FastifyRequest): string =>
  req.routeOptions?.url ?? req.url.split("?")[0];

const parseLoggingRequest = (req: FastifyRequest): LoggingRequest => ({
  scheme: req.protocol,
  method: req.method,
  path: getPathWithoutParams(req),
  hostname: req.hostname,
  query_params: req.query,
});

export const parseFullLoggingRequest = (
  req: FastifyRequest,
): FullLoggingRequest => ({
  ...parseLoggingRequest(req),
  headers: req.headers,
  client_ip: req.ip,
  user_agent: req.headers["user-agent"] ?? undefined,
});

const parseLoggingResponse = (res: FastifyReply): LoggingResponse => ({
  status_code: res.statusCode,
  headers: res.getHeaders(),
});

export const getLoggerConfiguration = (
  customLoggerOptions?: PinoLoggerOptions,
): PinoLoggerOptions => ({
  base: { hostname: hostname() },
  messageKey: MESSAGE_KEY,
  mixin: () => ({
    timestamp: Date.now(),
    ...getLoggingContext({ includeError: false }),
  }),
  redact: {
    paths: REDACTED_PATHS,
    censor: REDACTED_VALUE,
  },
  timestamp: false,
  formatters: {
    level: (name: string, levelVal: number) => ({
      level: levelVal,
      level_name: name.toUpperCase(),
    }),
  },
  ...(customLoggerOptions ?? {}),
});
