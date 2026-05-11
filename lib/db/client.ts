import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;
const g = globalThis as unknown as { _pgPool?: Pool; _db?: DbType };

function getPool(): Pool {
  if (!g._pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    g._pgPool = new Pool({ connectionString: url });
  }
  return g._pgPool;
}

function getDb(): DbType {
  if (!g._db) {
    g._db = drizzle(getPool(), { schema });
  }
  return g._db;
}

// Proxy so callers can still use `db.select()...` directly
export const pool = new Proxy({} as Pool, {
  get: (_, prop) => (getPool() as unknown as Record<string | symbol, unknown>)[prop],
});

export const db = new Proxy({} as DbType, {
  get: (_, prop) => (getDb() as unknown as Record<string | symbol, unknown>)[prop],
});
