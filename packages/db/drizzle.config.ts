import { type Config } from "drizzle-kit";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

export default {
  breakpoints: true,
  introspect: {
    casing: "preserve"
  },
  dbCredentials: {
    url: ENV_SERVER.DATABASE_URL
  },
  dialect: "postgresql",
  out: "./migrations",
  schema: "./src/schema/migration.ts",

  strict: true,
  verbose: true
} satisfies Config;
