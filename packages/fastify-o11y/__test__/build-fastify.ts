import Fastify from "fastify";
import o11yPlugin, { type PluginConfig } from "../src/index";

export const buildFastify = async (pluginConfig?: PluginConfig) => {
  const server = Fastify();
  await server.register(o11yPlugin, pluginConfig);

  server.get("/", (_request, reply) => {
    reply.send({ hello: "world" });
  });

  server.post(
    "/validation/id",
    {
      schema: {
        body: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
          },
        },
      },
    },
    (_request, reply) => {
      reply.send({ hello: "world" });
    },
  );

  return server;
};
