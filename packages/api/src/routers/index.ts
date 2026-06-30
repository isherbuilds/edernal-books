import { type RouterClient } from "@orpc/server";

import { accountingRouter } from "#@/routers/accounting/index";
import { healthRouter } from "#@/routers/health/index";
import { itemsRouter } from "#@/routers/items/index";
import { organizationsRouter } from "#@/routers/organizations/index";
import { partiesRouter } from "#@/routers/parties/index";
import { privateRouter } from "#@/routers/private/index";
import { purchaseDocumentsRouter } from "#@/routers/purchase-documents/index";
import { salesDocumentsRouter } from "#@/routers/sales-documents/index";
import { settlementsRouter } from "#@/routers/settlements/index";

export const appRouter = {
  accounting: accountingRouter,
  health: healthRouter,
  items: itemsRouter,
  organizations: organizationsRouter,
  parties: partiesRouter,
  purchaseDocuments: purchaseDocumentsRouter,
  private: privateRouter,
  salesDocuments: salesDocumentsRouter,
  settlements: settlementsRouter
};

export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
