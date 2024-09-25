import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_METHOD,
  DEFAULT_PATH,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";
import { HttpErrorClasses, NotFoundError } from "@ogcio/shared-errors";

test("Common error is managed as expected", async (t) => {
  const { server } = initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: DEFAULT_PATH,
    query: { status_code: "500", error_message: "error message" },
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 500);
  assert.deepStrictEqual(response.json(), {
    code: HttpErrorClasses.ServerError,
    detail: "error message",
    requestId: "req-1",
    name: "FastifyError",
  });
});

test("Validation error is managed as a Life Events One", async (t) => {
  const { server } = initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: "/validation",
    query: { error_message: "error message" },
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 422);
  assert.deepStrictEqual(response.json(), {
    code: HttpErrorClasses.ValidationError,
    detail: "error message",
    requestId: "req-1",
    name: "VALIDATION_ERROR",
    validation: [
      {
        fieldName: "the.instance.path",
        message: "error message",
        validationRule: "field",
        additionalInfo: {
          field: "one",
          property: "two",
        },
      },
    ],
    process: "/validation?error_message=error+message",
  });
});

test("If an error with status 200 is raised, it is managed as an unknown one", async (t) => {
  const { server } = initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: DEFAULT_PATH,
    query: { status_code: "200", error_message: "error message" },
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 500);
  assert.deepStrictEqual(response.json(), {
    code: HttpErrorClasses.UnknownError,
    detail: "error message",
    requestId: "req-1",
    name: "FastifyError",
  });
});

test("404 error is managed as expected", async (t) => {
  const { server } = initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: "/this-path-does-not-exist",
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 404);
  assert.deepStrictEqual(response.json(), {
    code: HttpErrorClasses.NotFoundError,
    detail: "Route not found",
    requestId: "req-1",
    process: "/this-path-does-not-exist",
    name: new NotFoundError("TEMP", "TEMP").name,
  });
});