import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreateItemInputSchema,
  GetItemInputSchema,
  ItemSchema,
  ListItemsInputSchema,
  ListItemsOutputSchema,
  SetItemActiveInputSchema,
  UpdateItemInputSchema
} from "@tsu-stack/core/items";
import { createItem, getItem, listItems, updateItem } from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

export const itemsRouter = {
  list: organizationPermissionProcedure(ListItemsInputSchema, canAccessAccounting)
    .route({
      description: "List organization goods and services",
      method: "GET"
    })
    .output(ListItemsOutputSchema)
    .handler(({ context, input }) =>
      listItems(context.db, {
        cursor: input.cursor,
        includeInactive: input.includeInactive,
        kind: input.kind,
        limit: input.limit,
        organizationId: context.organizationId,
        q: input.q,
        usage: input.usage
      })
    ),
  get: organizationPermissionProcedure(GetItemInputSchema, canAccessAccounting)
    .route({
      description: "Get an organization good or service",
      method: "GET"
    })
    .output(ItemSchema)
    .handler(({ context, input }) =>
      getItem(context.db, {
        id: input.id,
        organizationId: context.organizationId
      })
    ),
  create: organizationPermissionProcedure(CreateItemInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization good or service",
      method: "POST"
    })
    .output(ItemSchema)
    .handler(({ context, input }) =>
      createItem(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  update: organizationPermissionProcedure(UpdateItemInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization good or service",
      method: "PUT"
    })
    .output(ItemSchema)
    .handler(({ context, input }) =>
      updateItem(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  setActive: organizationPermissionProcedure(SetItemActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization good or service",
      method: "PUT"
    })
    .output(ItemSchema)
    .handler(({ context, input }) =>
      updateItem(context.db, {
        id: input.id,
        isActive: input.isActive,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    )
};
