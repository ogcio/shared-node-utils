import { FastifyInstance } from "fastify";
import { buildFastify } from "./build-fastify.js";
import {
  TestingLoggerDestination,
  getTestingDestinationLogger,
} from "./build-logger.js";
import {
  LogErrorClasses,
  LogMessages,
} from "../../src/logging-wrapper-entities.js";
import assert from 'node:assert/strict';

export const DEFAULT_HOSTNAME = "localhost";
export const DEFAULT_PORT = 80;
export const DEFAULT_USER_AGENT = "lightMyRequest";
export const DEFAULT_REQUEST_HEADERS = {
  "user-agent": "lightMyRequest",
  host: "localhost:80",
};
export const DEFAULT_CLIENT_IP = "127.0.0.1";
export const DEFAULT_CONTENT_TYPE = "application/json; charset=utf-8";
export const DEFAULT_METHOD = "GET";
export const DEFAULT_SCHEME = "http";
export const DEFAULT_PATH = "/ping";

export const initializeServer = (): {
  server: FastifyInstance;
  loggingDestination: TestingLoggerDestination;
} => {
  const loggingDestination = getTestingDestinationLogger();
  const server = buildFastify(loggingDestination.loggerDestination);

  return { server, loggingDestination };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseLogEntry = (logEntry: string): { [x: string]: any } =>
  JSON.parse(logEntry);

export const checkGenericEntryFields = (params: {
  parsedEntry: { [x: string]: unknown };
  expectedLevelName: string;
  expectedMessage: string;
}): void => {
  const { parsedEntry, expectedLevelName, expectedMessage } = params;

  assert.equal(parsedEntry.level_name, expectedLevelName);
  assert.ok(typeof parsedEntry.level !== "undefined");
  assert.equal(typeof parsedEntry.level, "number");
  assert.equal(parsedEntry.message, expectedMessage);
  assert.ok(typeof parsedEntry.request_id !== "undefined");
  assert.equal(typeof parsedEntry.request_id, "string");
  assert.ok(typeof parsedEntry.timestamp !== "undefined");
  assert.equal(typeof parsedEntry.timestamp, "number");
};

export const checkExpectedRequestEntry = (params: {
  requestLogEntry: string;
  inputScheme?: string;
  inputQueryParams?: { [x: string]: unknown };
  inputMethod?: string;
  inputPath?: string;
  inputHeaders?: { [x: string]: unknown };
}): void => {
  const parsed = parseLogEntry(params.requestLogEntry);
  params.inputMethod = params.inputMethod ?? DEFAULT_METHOD;
  params.inputScheme = params.inputScheme ?? DEFAULT_SCHEME;
  params.inputPath = params.inputPath ?? DEFAULT_PATH;
  checkGenericEntryFields({
    parsedEntry: parsed,
    expectedLevelName: "INFO",
    expectedMessage: LogMessages.NewRequest,
  });
  assert.ok(typeof parsed.request !== "undefined");
  assert.equal(parsed.request?.scheme, params.inputScheme);
  assert.equal(parsed.request?.method, params.inputMethod);
  assert.equal(parsed.request?.path, params.inputPath);
  assert.equal(parsed.request?.hostname, DEFAULT_HOSTNAME);
  assert.equal(parsed.request?.port, DEFAULT_PORT);
  assert.deepStrictEqual(parsed.request?.query_params, params.inputQueryParams ?? {});
  assert.deepStrictEqual(parsed.request?.headers, {
    ...DEFAULT_REQUEST_HEADERS,
    ...(params.inputHeaders ?? {}),
  });
  assert.equal(parsed.request?.client_ip, DEFAULT_CLIENT_IP);
  assert.equal(parsed.request?.user_agent, DEFAULT_USER_AGENT);
};

export const checkExpectedResponseEntry = (params: {
  responseLogEntry: string;
  inputScheme?: string;
  inputQueryParams?: { [x: string]: unknown };
  inputMethod?: string;
  inputPath?: string;
  responseStatusCode: number;
  expectedMessage?: string;
}): void => {
  const parsed = parseLogEntry(params.responseLogEntry);
  params.inputMethod = params.inputMethod ?? DEFAULT_METHOD;
  params.inputScheme = params.inputScheme ?? DEFAULT_SCHEME;
  params.inputPath = params.inputPath ?? DEFAULT_PATH;

  checkGenericEntryFields({
    parsedEntry: parsed,
    expectedLevelName: "INFO",
    expectedMessage: params.expectedMessage ?? LogMessages.Response,
  });
  assert.ok(typeof parsed.request !== "undefined");
  assert.equal(parsed.request.scheme, params.inputScheme);
  assert.equal(parsed.request.method, params.inputMethod);
  assert.equal(parsed.request.path, params.inputPath);
  assert.equal(parsed.request.hostname, DEFAULT_HOSTNAME);
  assert.equal(parsed.request.port, DEFAULT_PORT);
  assert.deepStrictEqual(parsed.request.query_params, params.inputQueryParams ?? {});
  assert.ok(typeof parsed.response !== "undefined");
  assert.equal(parsed.response.status_code, params.responseStatusCode);
  assert.equal(parsed.response.headers["content-type"], DEFAULT_CONTENT_TYPE);
};

export const checkExpectedApiTrackEntry = (params: {
  apiTrackLogEntry: string;
  inputScheme?: string;
  inputQueryParams?: { [x: string]: unknown };
  inputMethod?: string;
  inputPath?: string;
  errorClass?: string;
  errorMessage?: string;
  errorCode?: string;
  responseStatusCode: number;
}) => {
  params.inputMethod = params.inputMethod ?? DEFAULT_METHOD;
  params.inputScheme = params.inputScheme ?? DEFAULT_SCHEME;
  params.inputPath = params.inputPath ?? DEFAULT_PATH;

  checkExpectedResponseEntry({
    ...params,
    responseLogEntry: params.apiTrackLogEntry,
    expectedMessage: LogMessages.ApiTrack,
  });

  if (!params.errorClass) {
    return;
  }

  const parsed = parseLogEntry(params.apiTrackLogEntry);

  assert.ok(typeof parsed.error !== "undefined");
  assert.equal(parsed.error.class, params.errorClass);
  assert.equal(parsed.error.message, params.errorMessage);
  assert.equal(parsed.error.code, params.errorCode);
};

export const checkExpectedErrorEntry = (params: {
  errorLogEntry: string;
  inputScheme?: string;
  inputQueryParams?: { [x: string]: unknown };
  inputMethod?: string;
  inputPath?: string;
  errorClass: string;
  errorMessage: string;
  errorCode: string;
  expectedLevelName?: string;
}): void => {
  const parsed = parseLogEntry(params.errorLogEntry);
  params.inputMethod = params.inputMethod ?? DEFAULT_METHOD;
  params.inputScheme = params.inputScheme ?? DEFAULT_SCHEME;
  params.inputPath = params.inputPath ?? DEFAULT_PATH;
  params.expectedLevelName = params.expectedLevelName ?? "ERROR";
  checkGenericEntryFields({
    parsedEntry: parsed,
    expectedLevelName: params.expectedLevelName,
    expectedMessage: "ERROR",
  });
  assert.ok(typeof parsed.request !== "undefined");
  assert.equal(parsed.request?.scheme, params.inputScheme);
  assert.equal(parsed.request?.method, params.inputMethod);
  assert.equal(parsed.request?.path, params.inputPath);
  assert.equal(parsed.request?.hostname, DEFAULT_HOSTNAME);
  assert.equal(parsed.request?.port, DEFAULT_PORT);
  assert.deepStrictEqual(parsed.request?.query_params, params.inputQueryParams ?? {});
  assert.ok(typeof parsed.error !== "undefined");
  assert.equal(parsed.error.class, params.errorClass);
  assert.equal(parsed.error.code, params.errorCode);
  assert.equal(parsed.error.message, params.errorMessage);
  assert.ok(typeof parsed.error.trace !== "undefined");
  assert.equal(typeof parsed.error.trace, "string");
};

export const runErrorTest = async (params: {
  server: FastifyInstance;
  loggingDestination: TestingLoggerDestination;
  inputStatusCode?: string;
  errorMessage: string;
  expectedClass: LogErrorClasses;
  expectedStatusCode: number;
  expectedErrorMessage?: string;
  path?: string;
  expectedFastifyCode?: string;
}) => {
  const {
    server,
    loggingDestination,
    inputStatusCode,
    errorMessage,
    expectedClass,
    expectedStatusCode,
    expectedErrorMessage,
  } = params;
  const path = params.path ?? "/error";
  const expectedFastifyCode = params.expectedFastifyCode ?? "CUSTOM_CODE";
  const inputHeaders = { accept: DEFAULT_CONTENT_TYPE };
  const query: { error_message: string; status_code?: string } = {
    error_message: errorMessage,
  };
  if (inputStatusCode) {
    query.status_code = inputStatusCode;
  }

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: path,
    query,
    headers: inputHeaders,
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response.statusCode, expectedStatusCode);
  const loggedRecords = loggingDestination.getLoggedRecords();
  assert.equal(loggedRecords.length, 4);
  checkExpectedRequestEntry({
    requestLogEntry: loggedRecords[0],
    inputPath: path,
    inputQueryParams: query,
    inputHeaders,
  });
  checkExpectedErrorEntry({
    errorLogEntry: loggedRecords[1],
    inputPath: path,
    errorClass: expectedClass,
    errorMessage,
    errorCode: expectedFastifyCode,
    inputQueryParams: query,
    expectedLevelName: "ERROR",
  });

  checkExpectedResponseEntry({
    responseLogEntry: loggedRecords[2],
    inputPath: path,
    inputQueryParams: query,
    responseStatusCode: Number(expectedStatusCode),
    expectedMessage: expectedErrorMessage,
  });
  checkExpectedApiTrackEntry({
    apiTrackLogEntry: loggedRecords[3],
    inputPath: path,
    inputQueryParams: query,
    responseStatusCode: Number(expectedStatusCode),
    errorClass: expectedClass,
    errorMessage,
    errorCode: expectedFastifyCode,
  });
};
