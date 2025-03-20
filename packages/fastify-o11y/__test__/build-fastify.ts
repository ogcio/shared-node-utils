import Fastify from "fastify";
import o11yPlugin from "../src/index";

export const buildFastify = () => {
  const server = Fastify();
  server.register(o11yPlugin);

  server.get("/", (_request, reply) => {
    reply.send({ hello: "world" });
  });

  return server;
};
