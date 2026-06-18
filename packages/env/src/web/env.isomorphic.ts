import { createEnv } from "@t3-oss/env-core";
import { isProduction } from "std-env";
import { z } from "zod";

type ImportMetaWithEnv = ImportMeta & {
  env?: Record<string, string | boolean | undefined>;
};

const runtimeEnv = (import.meta as ImportMetaWithEnv).env ?? process.env;

console.debug("⏳ [ENV_WEB_ISOMORPHIC] Loading environment variables...", {
  VITE_SERVER_URL: runtimeEnv.VITE_SERVER_URL,
  VITE_WEB_URL: runtimeEnv.VITE_WEB_URL
});

export const ENV_WEB_ISOMORPHIC = createEnv({
  client: {
    VITE_IMGPROXY_SIGNATURE: z.string().default("_"),
    VITE_IMGPROXY_URL: z.url().optional(),
    VITE_SERVER_URL: isProduction ? z.url() : z.url().default("http://localhost:5000/server"),
    VITE_WEB_URL: isProduction ? z.url() : z.url().default("http://localhost:3000/web")
  },
  clientPrefix: "VITE_",
  emptyStringAsUndefined: true,
  runtimeEnv
});

console.debug("✅ [ENV_WEB_ISOMORPHIC] Successfully loaded environment variables.");
