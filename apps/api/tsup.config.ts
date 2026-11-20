import { cpSync } from "node:fs";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts", "src/worker.ts", "src/db/migrate.ts", "src/db/seed.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  noExternal: ["@jobpilot/shared"],
  onSuccess: async () => {
    cpSync("drizzle", "dist/drizzle", { recursive: true });
  },
});
