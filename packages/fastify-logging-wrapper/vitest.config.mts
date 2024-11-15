import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: "junit",
    coverage: {
      reporter: ["text"],
      provider: "istanbul",
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
