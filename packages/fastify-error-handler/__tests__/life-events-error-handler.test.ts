import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_METHOD,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";
import * as sharedErrors from "@ogcio/shared-errors";

const errorsProvider = [
  { errorType: sharedErrors.AuthenticationError, expectedStatusCode: 401 },
  { errorType: sharedErrors.AuthorizationError, expectedStatusCode: 403 },
  { errorType: sharedErrors.LifeEventsError, expectedStatusCode: 500 },
  { errorType: sharedErrors.NotFoundError, expectedStatusCode: 404 },
  { errorType: sharedErrors.NotImplementedError, expectedStatusCode: 500 },
  { errorType: sharedErrors.ServerError, expectedStatusCode: 500 },
  { errorType: sharedErrors.ThirdPartyError, expectedStatusCode: 502 },
];

errorsProvider.forEach((errorProv) =>
  test(`Error is managed in the correct way - ${errorProv.errorType.name}`, async (t) => {
    const { server } = initializeServer();
    t.after(() => server.close());

    const errorConstructor = sharedErrors[errorProv.errorType.name];
    const errorInstance = new errorConstructor("MOCK", "message");

    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: `/life-events/${errorProv.errorType.name}`,
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, errorProv.expectedStatusCode);
    assert.deepStrictEqual(response.json(), {
      code: sharedErrors.parseHttpErrorClass(errorProv.expectedStatusCode),
      detail: "Failed Correctly!",
      requestId: "req-1",
      name: errorInstance.name,
      process: "TESTING",
    });
  })
);

test(`Custom error is managed based on parameters`, async (t) => {
  const { server } = initializeServer();
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
    name: new sharedErrors.CustomError("MOCK", "mock", 503).name,
    process: "CUSTOM_PROCESS",
  });
});

test(`Validation error is managed as expected`, async (t) => {
  const { server } = initializeServer();
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
    name: new sharedErrors.ValidationError("MOCK", "mock").name,
    process: "VALIDATION_PROCESS",
    validation: [
      { fieldName: "field", message: "error", validationRule: "equal" },
    ],
  });
});