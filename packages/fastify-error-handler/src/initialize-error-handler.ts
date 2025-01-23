import { type HttpError, httpErrors } from "@fastify/sensible";
import {
  LogMessages,
  getLoggingContextError,
  setLoggingContext,
} from "@ogcio/fastify-logging-wrapper";
import {
  type HttpErrorClasses,
  type ValidationErrorData,
  parseHttpErrorClass,
} from "@ogcio/shared-errors";
import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { FastifySchemaValidationError } from "fastify/types/schema.js";
import { isHttpError } from "http-errors";

export interface OutputHttpError {
  code: HttpErrorClasses;
  detail: string;
  requestId: string;
  name: string;
  validation?: ValidationErrorData[];
  process?: string;
  statusCode: number;
}

// The error handler below is the same as the original one in Fastify,
// just without unwanted log entries
// I've opened an issue to fastify to ask them if we could avoid logging
// those entries when disableRequestLogging is true
// https://github.com/fastify/fastify/issues/5409
export const setupErrorHandler = (server: FastifyInstance): void => {
  const setErrorHeaders = (
    error: null | {
      headers?: { [x: string]: string | number | string[] | undefined };
      status?: number;
      statusCode?: number;
    },
    reply: FastifyReply,
  ) => {
    const res = reply.raw;
    let statusCode = res.statusCode;
    statusCode = statusCode >= 400 ? statusCode : 500;
    // treat undefined and null as same
    if (error != null) {
      if (error.headers !== undefined) {
        reply.headers(error.headers);
      }
      if (error.status && error.status >= 400) {
        statusCode = error.status;
      } else if (error.statusCode && error.statusCode >= 400) {
        statusCode = error.statusCode;
      }
    }
    res.statusCode = statusCode;
    reply.statusCode = res.statusCode;
  };

  server.setErrorHandler((error, request, reply) => {
    if (isHttpError(error)) {
      manageHttpError(error, request, reply);
      return;
    }
    if (error.validation) {
      const httpError = toOutputHttpValidationError(error);
      manageHttpError(httpError, request, reply);
      return;
    }

    setErrorHeaders(error, reply);
    reply.send(getResponseFromFastifyError(error, request));
  });
};

// The error handler below is the same as the original one in Fastify,
// just without unwanted log entries
export const initializeNotFoundHandler = (server: FastifyInstance): void => {
  server.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    const error = httpErrors.notFound(`Route not found: ${request.url}`);
    setLoggingContext({
      error,
    });

    request.log.error({ error: getLoggingContextError() }, LogMessages.Error);
    manageHttpError(error, request, reply);
  });
};

const getValidationFromFastifyError = (
  validationInput: FastifySchemaValidationError[],
): { validation: ValidationErrorData[] } => {
  const output: ValidationErrorData[] = [];

  for (const input of validationInput) {
    const key =
      input.params?.missingProperty ?? input.instancePath.split("/").pop();
    const message = input.message ?? input.keyword;
    if (key && typeof key === "string") {
      output.push({
        fieldName: key,
        message,
        validationRule: input.keyword,
        additionalInfo: input.params,
      });
      continue;
    }

    output.push({
      fieldName: input.schemaPath,
      message,
      validationRule: input.keyword,
      additionalInfo: input.params,
    });
  }

  return { validation: output };
};

const getResponseFromFastifyError = (
  error: FastifyError,
  request: FastifyRequest,
): OutputHttpError => {
  const errorDetails = parseHttpErrorClass(error.statusCode);

  const output: OutputHttpError = {
    code: errorDetails.errorClass,
    detail: error.message,
    requestId: request.id,
    name: error.name,
    statusCode: errorDetails.statusCode,
  };
  if (error.validation && error.validation.length > 0) {
    output.validation = getValidationFromFastifyError(
      error.validation,
    ).validation;
  }

  return output;
};

const manageHttpError = (
  error: HttpError,
  request: FastifyRequest,
  reply: FastifyReply,
): void => {
  reply.raw.statusCode = error.statusCode;
  reply.statusCode = error.statusCode;
  const errorDetails = parseHttpErrorClass(error.statusCode);
  const errorResponse: OutputHttpError = {
    code: errorDetails.errorClass,
    detail: error.message,
    requestId: request.id,
    name: error.name,
    process: error.errorProcess,
    statusCode: errorDetails.statusCode,
  };
  let validationErrors =
    error.validationErrors && error.validationErrors.length > 0
      ? error.validationErrors
      : undefined;
  if (!validationErrors && error.validation && error.validation.length > 0) {
    validationErrors = error.validation;
  }

  if (validationErrors) {
    errorResponse.validation = validationErrors;
  }
  console.log({ errorResponse, errorDetails });
  reply.status(error.statusCode).send(errorResponse);
};

const toOutputHttpValidationError = (error: FastifyError): HttpError => {
  if (!error.validation) {
    throw httpErrors.createError(500, "This is not a validation error");
  }

  return httpErrors.createError(
    422,
    error.message,
    getValidationFromFastifyError(error.validation),
  );
};
