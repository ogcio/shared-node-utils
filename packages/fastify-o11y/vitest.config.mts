import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: "default",
    coverage: {
      reporter: ["text", "cobertura"],
      provider: "istanbul",
      exclude: ["__test__"],
    },
    include: [
      "**/@(test?(s)|__test?(s)__)/**/*.test.@(js|cjs|mjs|tap|cts|jsx|mts|ts|tsx)",
      "**/*.@(test?(s)|spec).@(js|cjs|mjs|tap|cts|jsx|mts|ts|tsx)",
      "**/test?(s).@(js|cjs|mjs|tap|cts|jsx|mts|ts|tsx)",
    ],
    exclude: ["**/@(fixture*(s)|dist|node_modules)/**"],
    maxConcurrency: 1,
    testTimeout: 30000, // Timeout in milliseconds (30 seconds)
  },
});
