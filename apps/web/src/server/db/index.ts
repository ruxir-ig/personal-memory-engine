import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let cachedDb: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!cachedDb) {
    const client = postgres(process.env.DATABASE_URL, { max: 5 });
    cachedDb = drizzle(client, { schema });
  }
  return cachedDb;
}
