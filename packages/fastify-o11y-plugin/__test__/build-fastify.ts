import Fastify from "fastify";
import o11yPlugin, { X_TRACE_ID } from "../src/index";
import { getActiveSpan } from "@ogcio/o11y-sdk-node";

export const buildFastify = () => {
  const server = Fastify();
  server.register(o11yPlugin);

  server.get("/", function (_request, reply) {
    reply.send({ hello: "world" });
  });

  return server;
};
