import { type RouterClient } from "@orpc/server";

import { accountingRouter } from "#@/routers/accounting/index";
import { healthRouter } from "#@/routers/health/index";
import { organizationsRouter } from "#@/routers/organizations/index";
import { privateRouter } from "#@/routers/private/index";

export const appRouter = {
  accounting: accountingRouter,
  health: healthRouter,
  organizations: organizationsRouter,
  private: privateRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
