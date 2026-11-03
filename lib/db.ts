import { Pool } from "pg";
import { validateEnv } from "./env";

declare global {
  var pgPool: Pool | undefined;
}

export const pool =
  global.pgPool ??
  new Pool({
    connectionString: validateEnv(process.env).DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5000,
    statement_timeout: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}
