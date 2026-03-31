import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: {
      junit: "junit.xml",
    },
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/abi/**", "src/index.ts"],
      reporter: process.env.CI ? ["lcov"] : ["text", "lcov"],
    },
  },
});
