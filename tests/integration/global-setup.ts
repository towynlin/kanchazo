import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "@/lib/db/schema";
import path from "path";

export async function setup() {
  const url =
    process.env.DATABASE_URL || "postgres://kanchazo:kanchazo@localhost:5432/kanchazo_test";
  const pool = new Pool({ connectionString: url });
  const db = drizzle(pool, { schema });
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "db/migrations") });
  await pool.end();
}
