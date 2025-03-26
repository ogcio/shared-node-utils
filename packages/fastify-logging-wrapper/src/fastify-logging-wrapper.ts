import { REQUEST_ID_HEADER } from "@ogcio/shared-errors";
import type { FastifyInstance, FastifyServerOptions } from "fastify";
import type { PinoLoggerOptions } from "fastify/types/logger.js";
import hyperid from "hyperid";
import { type DestinationStream, pino } from "pino";
import {
  LogMessages,
  REQUEST_ID_LOG_LABEL,
} from "./logging-wrapper-entities.js";
import {
  getLoggerConfiguration,
  getLoggingContextError,
  getPartialLoggingContextError,
  parseFullLoggingRequest,
  resetLoggingContext,
  setLoggingContext,
} from "./logging-wrapper.js";

const hyperidInstance = hyperid({ fixedLength: true, urlSafe: true });

const isObjectNotEmpty = (value: object | undefined) => {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(
      Object.fromEntries(
        Object.entries(value).filter(([_, v]) => v !== undefined),
      ),
    ).length > 0
  );
};

export const initializeLoggingHooks = (server: FastifyInstance): void => {
  server.addHook("preHandler", (request, _reply, done) => {
    setLoggingContext({ request });

    const requestParsed = parseFullLoggingRequest(request);

    if (isObjectNotEmpty(requestParsed)) {
      request.log.info({ request: requestParsed }, LogMessages.NewRequest);
    } else {
      request.log.info(LogMessages.NewRequest);
    }

    done();
  });

  server.addHook("onResponse", (_req, reply, done) => {
    setLoggingContext({ response: reply });
    reply.log.info(LogMessages.Response);
    // Include error in API Track if exists
    const error = getPartialLoggingContextError();
    if (isObjectNotEmpty(error)) {
      reply.log.info({ error: error }, LogMessages.ApiTrack);
    } else {
      reply.log.info(LogMessages.ApiTrack);
    }

    resetLoggingContext();
    done();
  });

  server.addHook("onError", (request, _reply, error, done) => {
    setLoggingContext({ error });

    request.log.error({ error: getLoggingContextError() }, LogMessages.Error);

    done();
  });
};

export const getLoggingConfiguration = (
  loggerDestination?: DestinationStream,
  customLoggerOptions?: PinoLoggerOptions,
): FastifyServerOptions => ({
  logger: pino(getLoggerConfiguration(customLoggerOptions), loggerDestination),
  disableRequestLogging: true,
  genReqId: () => hyperidInstance(),
  requestIdLogLabel: REQUEST_ID_LOG_LABEL,
  requestIdHeader: REQUEST_ID_HEADER,
});
