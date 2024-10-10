import test from "node:test";
import assert from "node:assert/strict";
import { LogErrorClasses } from "../src/logging-wrapper-entities.js";
import {
  DEFAULT_METHOD,
  checkExpectedApiTrackEntry,
  checkExpectedErrorEntry,
  checkExpectedRequestEntry,
  checkExpectedResponseEntry,
  initializeServer,
  parseLogEntry,
  runErrorTest,
} from "./helpers/fastify-test-helpers.js";
import { httpErrors } from "@fastify/sensible";
import { getLoggingConfiguration } from "../src/fastify-logging-wrapper.js";
import { FastifyServerOptions } from "fastify";
import { DestinationStream } from "pino";

test("Error data are correctly set", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  await runErrorTest({
    server,
    loggingDestination,
    inputStatusCode: "500",
    expectedStatusCode: 500,
    errorMessage: "WHoooopS!",
    expectedClass: LogErrorClasses.ServerError,
  });
});

test("Unknown Error route logs expected values", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  await runErrorTest({
    server,
    loggingDestination,
    inputStatusCode: "399",
    expectedStatusCode: 500,
    errorMessage: "Unknown!",
    expectedClass: LogErrorClasses.UnknownError,
  });
});

test("400 Error route logs expected values", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  await runErrorTest({
    server,
    loggingDestination,
    inputStatusCode: "400",
    expectedStatusCode: 400,
    errorMessage: "Bad request!",
    expectedClass: LogErrorClasses.RequestError,
  });
});

test("422 Validation Error route logs expected values", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  await runErrorTest({
    server,
    loggingDestination,
    inputStatusCode: "422",
    expectedStatusCode: 422,
    errorMessage: "Bad request!",
    expectedClass: LogErrorClasses.ValidationError,
  });
});

test("Error without status code logs expected values", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  await runErrorTest({
    server,
    loggingDestination,
    inputStatusCode: undefined,
    expectedStatusCode: 500,
    errorMessage: "Unknown!",
    expectedClass: LogErrorClasses.UnknownError,
    expectedFastifyCode: "UNHANDLED_EXCEPTION",
  });
});

test("Life events error logs expected values", async (t) => {
  const { server, loggingDestination } = initializeServer();
  t.after(() => server.close());
  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: "/life-events-error",
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response.statusCode, 500);
  const loggedRecords = loggingDestination.getLoggedRecords();
  assert.equal(loggedRecords.length, 4);
  const mockErrorInstance = httpErrors.createError("mock");
  checkExpectedRequestEntry({
    requestLogEntry: loggedRecords[0],
    inputPath: "/life-events-error",
  });

  checkExpectedErrorEntry({
    errorLogEntry: loggedRecords[1],
    inputPath: "/life-events-error",
    errorClass: LogErrorClasses.ServerError,
    errorMessage: "mock",
    errorCode: mockErrorInstance.name,
    expectedLevelName: "ERROR",
  });
  const parsed = parseLogEntry(loggedRecords[1]);
  assert.equal(parsed.error.process, "TESTING");
  assert.equal(parsed.error.parent.message, "I am the parent");
  assert.equal(parsed.error.parent.name, "Error");
  assert.equal(typeof parsed.error.parent.stack, "string");

  checkExpectedResponseEntry({
    responseLogEntry: loggedRecords[2],
    inputPath: "/life-events-error",
    responseStatusCode: 500,
  });
  checkExpectedApiTrackEntry({
    apiTrackLogEntry: loggedRecords[3],
    inputPath: "/life-events-error",
    responseStatusCode: 500,
    errorClass: LogErrorClasses.ServerError,
    errorMessage: "mock",
    errorCode: mockErrorInstance.name,
  });
});

test("getLoggingConfiguration without customConfig, should use default pino logger", () => {
  const fastifyConfig: FastifyServerOptions = getLoggingConfiguration();

  assert.ok(fastifyConfig);
  assert.ok(fastifyConfig.logger);
  // expect undefined, because we're using the default fastify pino instance
  assert.equal(fastifyConfig.loggerInstance, undefined);
});

test("getLoggingConfiguration with customConfig, should create new logger instance", () => {
  class TestDestinationStream implements DestinationStream {
    write(msg: string): void {
      throw new Error("Test example!");
    }
  }

  const fastifyConfig: FastifyServerOptions = getLoggingConfiguration({
    pinoOptions: { messageKey: "TEST_NAME" },
    loggerDestination: new TestDestinationStream(),
  });

  assert.ok(fastifyConfig);
  // expect undefined, because we're using a new custom logger instance
  assert.equal(fastifyConfig.logger, undefined);
  assert.ok(fastifyConfig.loggerInstance);

  const symMessageKey = Reflect.ownKeys(fastifyConfig.loggerInstance).find(
    (s) => {
      return String(s) === "Symbol(pino.messageKey)";
    }
  );

  assert.equal(fastifyConfig.loggerInstance[symMessageKey!], "TEST_NAME");

  const symStream = Reflect.ownKeys(fastifyConfig.loggerInstance).find((s) => {
    return String(s) === "Symbol(pino.stream)";
  });

  assert.ok(
    fastifyConfig.loggerInstance[symStream!] instanceof TestDestinationStream
  );
});
