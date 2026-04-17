import { defineConfig } from "vitest/config";

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
  test: {
    dir: "src/e2e-tests",
    globals: true,
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
});
