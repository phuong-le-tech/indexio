import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { validateEnv } from "../lib/env";

async function migrate() {
  const env = validateEnv(process.env);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const sql = readFileSync(join(__dirname, "schema.sql"), "utf-8");
  try {
    await pool.query(sql);
    console.log("Migration applied successfully.");
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
