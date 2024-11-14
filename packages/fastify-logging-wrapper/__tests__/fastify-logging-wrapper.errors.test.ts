import { httpErrors } from "@fastify/sensible";
import { assert, afterEach, describe, it } from "vitest";
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

describe("Error data are correctly set", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    await runErrorTest({
      server,
      loggingDestination,
      inputStatusCode: "500",
      expectedStatusCode: 500,
      errorMessage: "WHoooopS!",
      expectedClass: LogErrorClasses.ServerError,
    });
  });
});

describe("Unknown Error route logs expected values", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    await runErrorTest({
      server,
      loggingDestination,
      inputStatusCode: "399",
      expectedStatusCode: 500,
      errorMessage: "Unknown!",
      expectedClass: LogErrorClasses.UnknownError,
    });
  });
});

describe("400 Error route logs expected values", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    await runErrorTest({
      server,
      loggingDestination,
      inputStatusCode: "400",
      expectedStatusCode: 400,
      errorMessage: "Bad request!",
      expectedClass: LogErrorClasses.RequestError,
    });
  });
});

describe("422 Validation Error route logs expected values", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    await runErrorTest({
      server,
      loggingDestination,
      inputStatusCode: "422",
      expectedStatusCode: 422,
      errorMessage: "Bad request!",
      expectedClass: LogErrorClasses.ValidationError,
    });
  });
});

describe("Error without status code logs expected values", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
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
});

describe("Life events error logs expected values", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
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
});
