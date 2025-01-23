import { HttpErrorClasses } from "@ogcio/shared-errors";
import httpErrors from "http-errors";
import { assert, afterEach, describe, it } from "vitest";
import {
  DEFAULT_METHOD,
  DEFAULT_PATH,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";

describe("Error management", () => {
  afterEach(async () => {
    const { server } = await initializeServer();
    await server.close();
  });

  it("manages common errors as expected", async () => {
    const { server } = await initializeServer();
    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
      query: { status_code: "500", error_message: "error message" },
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 500);
    assert.deepEqual(response.json(), {
      code: HttpErrorClasses.ServerError,
      detail: "error message",
      requestId: "req-1",
      name: "FastifyError",
      statusCode: 500,
    });
  });

  it("manages validation errors as expected", async () => {
    const { server } = await initializeServer();
    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: "/validation",
      query: { error_message: "error message" },
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 422);
    assert.deepEqual(response.json(), {
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
      statusCode: 422,
    });
  });

  it("manages unknown errors as 500", async () => {
    const { server } = await initializeServer();
    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: DEFAULT_PATH,
      query: { status_code: "200", error_message: "error message" },
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 500);
    assert.deepEqual(response.json(), {
      code: HttpErrorClasses.UnknownError,
      detail: "error message",
      requestId: "req-1",
      name: "FastifyError",
      statusCode: 500,
    });
  });

  it("manages 404 errors as expected", async () => {
    const { server } = await initializeServer();
    const response = await server.inject({
      method: DEFAULT_METHOD,
      url: "/this-path-does-not-exist",
    });

    assert.ok(typeof response !== "undefined");
    assert.equal(response?.statusCode, 404);
    assert.deepEqual(response.json(), {
      code: HttpErrorClasses.NotFoundError,
      detail: "Route not found: /this-path-does-not-exist",
      requestId: "req-1",
      name: new httpErrors[404]("TEMP").name,
      statusCode: 404,
    });
  });
});
