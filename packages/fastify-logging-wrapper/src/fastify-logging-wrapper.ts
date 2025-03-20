import { REQUEST_ID_HEADER } from "@ogcio/shared-errors";
import type {
  FastifyInstance,
  FastifyServerOptions,
  RawServerBase,
} from "fastify";
import type {
  FastifyLoggerOptions,
  PinoLoggerOptions,
} from "fastify/types/logger.js";
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
  return !(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
};

export const initializeLoggingHooks = (server: FastifyInstance): void => {
  server.addHook("preHandler", (request, _reply, done) => {
    setLoggingContext({ request });

    const request_parsed = parseFullLoggingRequest(request);

    if (isObjectNotEmpty(request_parsed)) {
      request.log.info({ request: request_parsed }, LogMessages.NewRequest);
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
      console.log("ERROR OBJECT BUT VALID", JSON.stringify(error));
      reply.log.info({ error: error }, LogMessages.ApiTrack);
    } else {
      console.log("INVALID ERROR OBJECT", JSON.stringify(error));

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
  customConfig?:
    | {
        pinoOptions?: PinoLoggerOptions;
        loggerDestination?: DestinationStream;
        additionalLoggerConfigs?: never;
      }
    | {
        pinoOptions?: never;
        loggerDestination?: never;
        additionalLoggerConfigs?: FastifyLoggerOptions<RawServerBase> &
          PinoLoggerOptions;
      },
): FastifyServerOptions => {
  if (customConfig?.pinoOptions || customConfig?.loggerDestination)
    return {
      loggerInstance: pino(
        { ...getLoggerConfiguration(), ...(customConfig?.pinoOptions ?? {}) },
        customConfig?.loggerDestination,
      ),
      disableRequestLogging: true,
      genReqId: () => hyperidInstance(),
      requestIdLogLabel: REQUEST_ID_LOG_LABEL,
      requestIdHeader: REQUEST_ID_HEADER,
    };

  let loggerConfiguration = getLoggerConfiguration();
  if (customConfig?.additionalLoggerConfigs) {
    loggerConfiguration = {
      ...loggerConfiguration,
      ...customConfig?.additionalLoggerConfigs,
    };
  }
  return {
    logger: loggerConfiguration,
    disableRequestLogging: true,
    genReqId: () => hyperidInstance(),
    requestIdLogLabel: REQUEST_ID_LOG_LABEL,
    requestIdHeader: REQUEST_ID_HEADER,
  };
};
