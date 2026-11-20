import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "./index";

const here = path.dirname(fileURLToPath(import.meta.url));

export async function runMigrations() {
  // Works from src/db (tsx) and dist (bundled), where drizzle/ is copied next to the bundle.
  const candidates = [path.resolve(here, "../../drizzle"), path.resolve(here, "../drizzle"), path.resolve(here, "drizzle")];
  const fs = await import("node:fs");
  const folder = candidates.find((c) => fs.existsSync(path.join(c, "meta")));
  if (!folder) throw new Error(`drizzle migrations folder not found (looked in ${candidates.join(", ")})`);
  await migrate(db, { migrationsFolder: folder });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  runMigrations()
    .then(() => {
      console.log("migrations applied");
      return pool.end();
    })
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
