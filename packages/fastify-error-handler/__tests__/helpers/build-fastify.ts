import { FastifyError, createError } from "@fastify/error";
import { pino, DestinationStream } from "pino";
import fastify, { FastifyInstance } from "fastify";
import { initializeErrorHandler } from "../../src/index.js";
import fastifySensible from "@fastify/sensible";
import httpErrors from "http-errors";
export const buildFastify = async (
  loggerDestination?: DestinationStream,
): Promise<FastifyInstance> => {
  const server = fastify({ loggerInstance: pino({}, loggerDestination) });
  initializeErrorHandler(server as unknown as FastifyInstance);
  await server.register(fastifySensible);
  server.get("/error", async (request, _reply) => {
    const parsed = request.query as { [x: string]: unknown };
    const requestedStatusCode = Number(parsed["status_code"] ?? "500");
    const requestedMessage = String(parsed["error_message"] ?? "WHOOOPS");

    if (!parsed["status_code"]) {
      throw new Error(requestedMessage);
    }

    throw createError(
      "CUSTOM_CODE",
      requestedMessage as string,
      requestedStatusCode as number,
    )();
  });

  server.get("/validation", async (request, _reply) => {
    const parsed = request.query as { [x: string]: unknown };
    const requestedMessage = String(parsed["error_message"] ?? "WHOOOPS");

    const error = createError(
      "CUSTOM_CODE",
      requestedMessage as string,
      422,
    )() as FastifyError & {
      headers: { [x: string]: unknown };
      status: number | undefined;
    };

    error.validation = [
      {
        keyword: "field",
        instancePath: "the.instance.path",
        schemaPath: "the.schema.path",
        params: { field: "one", property: "two" },
        message: requestedMessage,
      },
    ];
    error.validationContext = "body";
    error.status = 423;

    throw error;
  });

  server.get("/life-events/custom", async (request, _reply) => {
    const parsed = request.query as { [x: string]: unknown };
    const requestedStatusCode = Number(parsed["status_code"] ?? "500");

    throw server.httpErrors.createError(
      requestedStatusCode as number,
      "message",
    );
  });

  server.get("/life-events/validation", async (_request, _reply) => {
    throw server.httpErrors.createError(422, "message", {
      validationErrors: [
        { fieldName: "field", message: "error", validationRule: "equal" },
      ],
    });
  });

  server.get("/life-events/:errorCode", async (request, _reply) => {
    const errorCode = Number(
      (request.params! as { errorCode: string }).errorCode,
    );
    if (!httpErrors[errorCode]) {
      throw new Error("Wrong parameter");
    }

    const errorObj = httpErrors[errorCode];

    throw new errorObj("Failed Correctly!");
  });

  return server as unknown as FastifyInstance;
};
