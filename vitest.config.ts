import { defineConfig } from "vitest/config";
import path from "node:path";
import { loadAnalyticsEnvironment } from "./analytics-env";

loadAnalyticsEnvironment();

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
