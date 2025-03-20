import { REQUEST_ID_HEADER } from "@ogcio/shared-errors";
import { assert, afterEach, describe, it } from "vitest";
import { LogMessages } from "../src/logging-wrapper-entities.js";
import {
  DEFAULT_METHOD,
  DEFAULT_PATH,
  checkExpectedRequestEntry,
  checkExpectedResponseEntry,
  checkGenericEntryFields,
  initializeServer,
  parseLogEntry,
} from "./helpers/fastify-test-helpers.js";

describe("Logging entries when all works fine are the expected ones", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());

    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    const loggedRecords = loggingDestination.getLoggedRecords();
    assert.equal(loggedRecords.length, 3);
    checkExpectedRequestEntry({
      requestLogEntry: loggedRecords[0],
    });
    checkExpectedResponseEntry({
      responseLogEntry: loggedRecords[1],
      responseStatusCode: 200,
    });
    checkExpectedResponseEntry({
      responseLogEntry: loggedRecords[2],
      responseStatusCode: 200,
      expectedMessage: LogMessages.ApiTrack,
    });
    const apiTrackEntry = JSON.parse(loggedRecords[2]);
    assert.notNestedProperty(apiTrackEntry, "error");
  });
});

describe("Request id is overriden by header", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    const customRequestId = "Another request id";
    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
      headers: { [REQUEST_ID_HEADER]: customRequestId },
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    const logged = loggingDestination.getLoggedRecords();
    checkExpectedRequestEntry({
      requestLogEntry: logged[0],
      inputHeaders: { [REQUEST_ID_HEADER]: customRequestId },
    });
    const parsedEntry = parseLogEntry(logged[0]);
    assert.deepEqual(parsedEntry.request_id, customRequestId);
  });
});

describe("Logging context is reset between requests", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());

    let response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    let loggedRecords = loggingDestination.getLoggedRecords();
    assert.equal(loggedRecords.length, 3);
    let parsedResponse = parseLogEntry(loggedRecords[1]);
    assert.ok(typeof parsedResponse.response !== "undefined");

    response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
    });
    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    loggedRecords = loggingDestination.getLoggedRecords();
    assert.equal(loggedRecords.length, 6);
    // 3 is the New Request for 2nd call
    parsedResponse = parseLogEntry(loggedRecords[3]);
    // if undefined it means that the logging context
    // has been reset between requests
    assert.ok(typeof parsedResponse.response === "undefined");
  });
});

describe("Additional logs are correctly written", () => {
  it("should pass", async () => {
    const { server, loggingDestination } = initializeServer();
    afterEach(() => server.close());
    const logMessage = "Testing additional logs";

    const response = await server.inject({
      method: "POST",
      url: "/logs",
      body: { log_entry: logMessage },
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 200);
    const loggedRecords = loggingDestination.getLoggedRecords();
    assert.equal(loggedRecords.length, 4);
    const parsedAdditional = parseLogEntry(loggedRecords[1]);
    checkGenericEntryFields({
      parsedEntry: parsedAdditional,
      expectedLevelName: "INFO",
      expectedMessage: logMessage,
    });
    assert.ok(typeof parsedAdditional.request !== "undefined");
  });
});
