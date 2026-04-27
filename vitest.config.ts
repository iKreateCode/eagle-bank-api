import { defineConfig } from "vitest/config";
import { config } from "dotenv";

config();

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 15000,
  },
});
