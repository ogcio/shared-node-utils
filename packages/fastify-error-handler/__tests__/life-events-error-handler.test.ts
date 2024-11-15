import * as sharedErrors from "@ogcio/shared-errors";
import httpErrors from "http-errors";
import { assert, afterEach, describe, it } from "vitest";
import {
  DEFAULT_METHOD,
  initializeServer,
} from "./helpers/fastify-test-helpers.js";

const errorsProvider = [
  { errorType: httpErrors[401], expectedStatusCode: 401 },
  { errorType: httpErrors[403], expectedStatusCode: 403 },
  { errorType: httpErrors[500], expectedStatusCode: 500 },
  { errorType: httpErrors[404], expectedStatusCode: 404 },
  { errorType: httpErrors[500], expectedStatusCode: 500 },
  { errorType: httpErrors[502], expectedStatusCode: 502 },
];

describe("Error management", () => {
  afterEach(async () => {
    const { server } = await initializeServer();
    await server.close();
  });

  for (const errorProv of errorsProvider) {
    it(`Error is managed in the correct way - ${errorProv.errorType.name}`, async (_t) => {
      const { server } = await initializeServer();
      await server.close();
    });

    for (const errorProv of errorsProvider) {
      it(`manages ${errorProv.errorType.name} correctly`, async () => {
        const { server } = await initializeServer();
        const errorInstance = new errorProv.errorType("message");

        const response = await server.inject({
          method: DEFAULT_METHOD,
          url: `/life-events/${errorProv.expectedStatusCode}`,
        });

        assert.ok(typeof response !== "undefined");
        assert.equal(response?.statusCode, errorProv.expectedStatusCode);
        assert.deepEqual(response.json(), {
          code: sharedErrors.parseHttpErrorClass(errorProv.expectedStatusCode),
          detail: "Failed Correctly!",
          requestId: "req-1",
          name: errorInstance.name,
        });
      });
    }

    it("manages custom errors based on parameters", async () => {
      const { server } = await initializeServer();
      const response = await server.inject({
        method: DEFAULT_METHOD,
        url: "/life-events/custom",
        query: { status_code: "503" },
      });

      assert.ok(typeof response !== "undefined");
      assert.equal(response?.statusCode, 503);
      assert.deepEqual(response.json(), {
        code: sharedErrors.parseHttpErrorClass(503),
        detail: "message",
        requestId: "req-1",
        name: new httpErrors[503]("MOCK").name,
      });
    });

    it("manages validation errors as expected", async () => {
      const { server } = await initializeServer();
      const response = await server.inject({
        method: DEFAULT_METHOD,
        url: "/life-events/validation",
      });

      assert.ok(typeof response !== "undefined");
      assert.equal(response?.statusCode, 422);
      assert.deepEqual(response.json(), {
        code: sharedErrors.parseHttpErrorClass(422),
        detail: "message",
        requestId: "req-1",
        name: new httpErrors[422]("MOCK").name,
        validation: [
          { fieldName: "field", message: "error", validationRule: "equal" },
        ],
      });
    });
  }
});
