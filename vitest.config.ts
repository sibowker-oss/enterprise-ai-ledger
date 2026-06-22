import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  test: {
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Mirror the tsconfig "@/*" path alias so tests import the same modules
      // the app does (e.g. "@/data/seed-data.json", "@/lib/...").
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
