import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_METHOD,
  DEFAULT_PATH,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";
import httpErrors from "http-errors";
import { HttpErrorClasses } from "@ogcio/shared-errors";

test("Common error is managed as expected", async (t) => {
  const { server } = await initializeServer();
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
  const { server } = await initializeServer();
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
    name: "UnprocessableEntityError",
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
  });
});

test("If an error with status 200 is raised, it is managed as an unknown one", async (t) => {
  const { server } = await initializeServer();
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
  const { server } = await initializeServer();
  t.after(() => server.close());

  const response = await server.inject({
    method: DEFAULT_METHOD,
    url: "/this-path-does-not-exist",
  });

  assert.ok(typeof response !== "undefined");
  assert.equal(response?.statusCode, 404);
  assert.deepStrictEqual(response.json(), {
    code: HttpErrorClasses.NotFoundError,
    detail: "Route not found: /this-path-does-not-exist",
    requestId: "req-1",
    name: new httpErrors[404]("TEMP").name,
  });
});