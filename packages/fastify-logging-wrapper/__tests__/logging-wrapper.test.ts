import { Level } from "pino";
import { getLoggerConfiguration } from "../src/logging-wrapper.js";
import { buildLogger } from "./helpers/build-logger.js";
import { hostname } from "os";
import { REDACTED_VALUE } from "../src/logging-wrapper-entities.js";
import assert from "node:assert";
import { test } from "node:test";

const getRandomFieldValue = () => Math.random().toString(36).slice(2);

const toRedactFields = {
  input_value: {
    request: {
      "x-api-key": "non redacted because not under headers",
      headers: {
        "x-amz-security-token": getRandomFieldValue(),
        "x-api-key": getRandomFieldValue(),
        authorization: getRandomFieldValue(),
        cookie: getRandomFieldValue(),
        "set-cookie": getRandomFieldValue(),
        "proxy-authorization": getRandomFieldValue(),
        non_to_redact: "non_redacted_value",
      },
    },
    response: {
      headers: {
        "x-amz-security-token": getRandomFieldValue(),
        "x-api-key": getRandomFieldValue(),
        authorization: getRandomFieldValue(),
        cookie: getRandomFieldValue(),
        "set-cookie": getRandomFieldValue(),
        "proxy-authorization": getRandomFieldValue(),
        non_to_redact: "non_redacted_value",
      },
    },
  },
  expected_output: {
    request: {
      "x-api-key": "non redacted because not under headers",
      headers: {
        "x-amz-security-token": REDACTED_VALUE,
        "x-api-key": REDACTED_VALUE,
        authorization: REDACTED_VALUE,
        cookie: REDACTED_VALUE,
        "set-cookie": REDACTED_VALUE,
        "proxy-authorization": REDACTED_VALUE,
        non_to_redact: "non_redacted_value",
      },
    },
    response: {
      headers: {
        "x-amz-security-token": REDACTED_VALUE,
        "x-api-key": REDACTED_VALUE,
        authorization: REDACTED_VALUE,
        cookie: REDACTED_VALUE,
        "set-cookie": REDACTED_VALUE,
        "proxy-authorization": REDACTED_VALUE,
        non_to_redact: "non_redacted_value",
      },
    },
  },
};

const methodsDataProvider = [
  {
    method: "trace",
    expected: {
      level: 10,
      level_name: "TRACE",
    },
  },
  {
    method: "debug",
    expected: {
      level: 20,
      level_name: "DEBUG",
    },
  },
  {
    method: "info",
    expected: {
      level: 30,
      level_name: "INFO",
    },
  },
  {
    method: "warn",
    expected: {
      level: 40,
      level_name: "WARN",
    },
  },
  {
    method: "error",
    expected: {
      level: 50,
      level_name: "ERROR",
    },
  },
  {
    method: "fatal",
    expected: {
      level: 60,
      level_name: "FATAL",
    },
  },
];

test("Basic format is the expected one", async (t) => {
  const { logger, loggedRecordsMethod } = buildLogger({
    ...getLoggerConfiguration("debug"),
  });
  logger.debug("test message");
  logger.info("another message");

  const loggedRecords = loggedRecordsMethod();
  assert.strictEqual(loggedRecords.length, 2);

  const parsed = JSON.parse(loggedRecords[0]);
  assert.strictEqual(typeof parsed.timestamp, "number");
  assert.ok(
    parsed.timestamp > Date.now() - 2000,
    "the timestamp must be newer than 2 seconds ago",
  );
  delete parsed.timestamp;
  assert.deepStrictEqual(parsed, {
    level: 20,
    level_name: "DEBUG",
    hostname: hostname(),
    message: "test message",
  });
});

test("Fields are redacted as expected", async (t) => {
  const { logger, loggedRecordsMethod } = buildLogger({
    ...getLoggerConfiguration(),
  });
  logger.warn(toRedactFields.input_value);

  const loggedRecords = loggedRecordsMethod();
  const parsed = JSON.parse(loggedRecords[0]);
  delete parsed.hostname;
  delete parsed.level;
  delete parsed.level_name;
  delete parsed.timestamp;

  assert.deepStrictEqual(parsed, toRedactFields.expected_output);
});

methodsDataProvider.forEach((methodDataProvider) =>
  test(`Methods are writing correct levels - ${methodDataProvider.method}`, async (t) => {
    const { logger, loggedRecordsMethod } = buildLogger({
      ...getLoggerConfiguration("trace"),
    });

    logger[methodDataProvider.method]("test");

    const loggedRecords = loggedRecordsMethod();
    assert.strictEqual(loggedRecords.length, 1);
    const parsed = JSON.parse(loggedRecords[0]);

    assert.strictEqual(parsed.level, methodDataProvider.expected.level);
    assert.strictEqual(
      parsed.level_name,
      methodDataProvider.expected.level_name,
    );
  }),
);
