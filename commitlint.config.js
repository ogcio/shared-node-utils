module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "shared-errors",
        "fastify-error-handler",
        "fastify-logging-wrapper",
        "api-auth",
        "nextjs-logging-wrapper",
      ],
    ],
  },
};
