import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { type RouterClient } from "@orpc/server";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { createIsomorphicFn } from "@tanstack/react-start";

import { ENV_WEB_ISOMORPHIC } from "@tsu-stack/env/web/env.isomorphic";

import { type AppRouter } from "#@/routers/index";

const getORPCClient = createIsomorphicFn()
  .server(async () => {
    const [
      { createRouterClient },
      { getRequestHeaders },
      { auth },
      { db },
      { createLogger },
      { appRouter }
    ] = await Promise.all([
      import("@orpc/server"),
      import("@tanstack/react-start/server"),
      import("@tsu-stack/auth/index"),
      import("@tsu-stack/db"),
      import("@tsu-stack/logger/server"),
      import("#@/routers/index")
    ]);

    return createRouterClient(appRouter, {
      context: async () => {
        const headers = getRequestHeaders();
        const authSession = await auth.api.getSession({ headers });

        return {
          authSession,
          db,
          logger: createLogger({ operation: "web__client__orpc" })
        };
      }
    });
  })
  .client((): RouterClient<AppRouter> => {
    const link = new RPCLink({
      fetch(url, options) {
        return fetch(url, {
          ...options,
          credentials: "include"
        });
      },
      url: `${ENV_WEB_ISOMORPHIC.VITE_SERVER_URL}/rpc`
    });

    return createORPCClient(link);
  });

export const client = getORPCClient() as unknown as RouterClient<AppRouter>;

export const orpc = createTanstackQueryUtils(client);
