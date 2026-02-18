import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    // Scheduled functions that call external APIs (OpenAI) fail in tests.
    // These fire asynchronously after the test completes and produce
    // unhandled rejections that are safe to ignore.
    dangerouslyIgnoreUnhandledErrors: true,
  },
});
