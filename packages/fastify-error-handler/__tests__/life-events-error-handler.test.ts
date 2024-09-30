import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_METHOD,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";
import httpErrors from "http-errors";
import * as sharedErrors from "@ogcio/shared-errors";

const errorsProvider = [
  { errorType: httpErrors[401], expectedStatusCode: 401 },
  { errorType: httpErrors[403], expectedStatusCode: 403 },
  { errorType: httpErrors[500], expectedStatusCode: 500 },
  { errorType: httpErrors[404], expectedStatusCode: 404 },
  { errorType: httpErrors[500], expectedStatusCode: 500 },
  { errorType: httpErrors[502], expectedStatusCode: 502 },
];

errorsProvider.forEach((errorProv) =>
  test(`Error is managed in the correct way - ${errorProv.errorType.name}`, async (t) => {
    const { server } = await initializeServer();
    t.after(() => server.close());

    const errorInstance = new errorProv.errorType("message");

    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: `/life-events/${errorProv.expectedStatusCode}`,
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, errorProv.expectedStatusCode);
    assert.deepStrictEqual(response.json(), {
      code: sharedErrors.parseHttpErrorClass(errorProv.expectedStatusCode),
      detail: "Failed Correctly!",
      requestId: "req-1",
      name: errorInstance.name,
    });
  })
);

test(`Custom error is managed based on parameters`, async (t) => {
  const { server } = await initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: `/life-events/custom`,
    query: { status_code: "503" },
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 503);
  assert.deepStrictEqual(response.json(), {
    code: sharedErrors.parseHttpErrorClass(503),
    detail: "message",
    requestId: "req-1",
    name: new httpErrors[503]("MOCK").name,
  });
});

test(`Validation error is managed as expected`, async (t) => {
  const { server } = await initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: `/life-events/validation`,
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 422);
  assert.deepStrictEqual(response.json(), {
    code: sharedErrors.parseHttpErrorClass(422),
    detail: "message",
    requestId: "req-1",
    name: new httpErrors[422]("MOCK").name,
    validation: [
      { fieldName: "field", message: "error", validationRule: "equal" },
    ],
  });
});
