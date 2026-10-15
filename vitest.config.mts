import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Fixed zone so date bucketing assertions are deterministic on any machine/CI.
// Set before workers start so every test process inherits it.
process.env.TZ = "Europe/Copenhagen";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // `server-only` throws outside a React Server environment; stub it for unit tests.
      "server-only": fileURLToPath(new URL("./tests/stubs/empty.ts", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      // The gate applies to the framework-free core, where the business rules live.
      include: ["src/core/**/*.ts"],
      exclude: ["src/core/**/ports/**", "src/core/domain/types.ts", "src/core/application/use-cases/pending-change.ts"],
      reporter: ["text", "html", "lcov"],
      thresholds: { statements: 95, branches: 88, functions: 95, lines: 95 },
    },
  },
});
