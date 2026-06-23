import "@tanstack/react-start/server-only";
import { sql } from "drizzle-orm";

import { db } from "#@/client";

export async function checkIsDbReady(): Promise<boolean> {
  try {
    await db.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export async function checkHealth(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
