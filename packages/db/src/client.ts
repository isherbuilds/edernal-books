import "@tanstack/react-start/server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { relations as authRelations } from "#@/schema/auth.schema";
import { relations } from "#@/schema/relations";

const client = postgres(ENV_SERVER.DATABASE_URL);

export const db = drizzle({
  client,
  // `defineRelationsPart()` must be merged after the main `defineRelations()` config.
  // https://orm.drizzle.team/docs/relations-v2#relations-parts
  relations: { ...relations, ...authRelations }
});

export type Database = typeof db;
export type TransactionClient = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type DatabaseOrTransaction = Database | TransactionClient;

export async function connectDb(): Promise<Database> {
  return db;
}

export async function closeDb(): Promise<void> {
  await client.end();
}
