import createError from "http-errors";
import { isNativeError } from "util/types";
export enum HttpErrorClasses {
  ServerError = "SERVER_ERROR",
  ValidationError = "VALIDATION_ERROR",
  RequestError = "REQUEST_ERROR",
  GatewayError = "GATEWAY_ERROR",
  UnknownError = "UNKNOWN_ERROR",
  NotFoundError = "NOT_FOUND_ERROR",
}

export const parseHttpErrorClass = (
  errorCode: number | undefined,
): { errorClass: HttpErrorClasses; statusCode: number } => {
  if (!errorCode) {
    return { errorClass: HttpErrorClasses.UnknownError, statusCode: 500 };
  }

  if (errorCode === 502) {
    return { errorClass: HttpErrorClasses.GatewayError, statusCode: errorCode };
  }

  if (errorCode >= 500) {
    return { errorClass: HttpErrorClasses.ServerError, statusCode: errorCode };
  }

  if (errorCode === 404) {
    return {
      errorClass: HttpErrorClasses.NotFoundError,
      statusCode: errorCode,
    };
  }

  if (errorCode === 422) {
    return {
      errorClass: HttpErrorClasses.ValidationError,
      statusCode: errorCode,
    };
  }

  if (errorCode >= 400) {
    return { errorClass: HttpErrorClasses.RequestError, statusCode: errorCode };
  }

  return { errorClass: HttpErrorClasses.UnknownError, statusCode: 500 };
};

export const REQUEST_ID_HEADER = "x-life-events-request-id";

export const parseErrorForLogging = (
  e: unknown,
): { name: string; message: string; stack?: string } => {
  if (createError.isHttpError(e) || isNativeError(e) || isFastifyError(e)) {
    return { message: e.message, stack: e.stack, name: e.name };
  }
  return { message: getErrorMessage(e), name: "UNKNOWN_ERROR" };
};

export const getErrorMessage = (e: unknown): string => {
  if (createError.isHttpError(e) || isNativeError(e) || isFastifyError(e)) {
    return e.message;
  }
  switch (typeof e) {
    case "string":
      return e;
    case "bigint":
    case "number":
    case "boolean":
      return String(e);
    case "object":
      if (e && "message" in e && typeof e.message === "string") {
        return e.message;
      }
      return e ? e.toString() : "";
    default:
      return "";
  }
};

const isFastifyError = (
  e: unknown,
): e is {
  code: string;
  name: string;
  statusCode?: number;
  message: string;
  stack?: string;
} =>
  typeof e === "object" &&
  e !== null &&
  "code" in e &&
  "name" in e &&
  "message" in e;
