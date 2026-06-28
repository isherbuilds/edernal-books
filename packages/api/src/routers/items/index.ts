import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  type ItemErrorCode,
  ItemErrorCodeSchema,
  CreateItemInputSchema,
  GetItemInputSchema,
  ItemSchema,
  ListItemsInputSchema,
  ListItemsOutputSchema,
  SetItemActiveInputSchema,
  UpdateItemInputSchema
} from "@tsu-stack/core/items";
import {
  createItem,
  getItem,
  ItemDbError,
  listItems,
  setItemActive,
  updateItem
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

const itemErrorDataSchema = z.object({
  code: ItemErrorCodeSchema
});
const itemErrors = {
  ITEM_ACCOUNT_ORGANIZATION_MISMATCH: { data: itemErrorDataSchema, status: 422 },
  ITEM_CURSOR_INVALID: { data: itemErrorDataSchema, status: 400 },
  ITEM_DUPLICATE_NAME: { data: itemErrorDataSchema, status: 409 },
  ITEM_NOT_FOUND: { data: itemErrorDataSchema, status: 404 }
} as const;

type ItemErrorFactories = Record<
  ItemErrorCode,
  (input: { data: { code: ItemErrorCode } }) => unknown
>;

export const itemsRouter = {
  list: organizationPermissionProcedure(ListItemsInputSchema, canAccessAccounting)
    .route({
      description: "List organization goods and services",
      method: "GET"
    })
    .errors(itemErrors)
    .output(ListItemsOutputSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await listItems(context.db, {
          cursor: input.cursor,
          includeInactive: input.includeInactive,
          kind: input.kind,
          limit: input.limit,
          organizationId: context.organizationId,
          q: input.q,
          usage: input.usage
        });
      } catch (error) {
        throwItemDbError(errors, error);
      }
    }),
  get: organizationPermissionProcedure(GetItemInputSchema, canAccessAccounting)
    .route({
      description: "Get an organization good or service",
      method: "GET"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await getItem(context.db, {
          id: input.id,
          organizationId: context.organizationId
        });
      } catch (error) {
        throwItemDbError(errors, error);
      }
    }),
  create: organizationPermissionProcedure(CreateItemInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization good or service",
      method: "POST"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await createItem(context.db, {
          ...input,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwItemDbError(errors, error);
      }
    }),
  update: organizationPermissionProcedure(UpdateItemInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization good or service",
      method: "PUT"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await updateItem(context.db, {
          ...input,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwItemDbError(errors, error);
      }
    }),
  setActive: organizationPermissionProcedure(SetItemActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization good or service",
      method: "PUT"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await setItemActive(context.db, {
          id: input.id,
          isActive: input.isActive,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwItemDbError(errors, error);
      }
    })
};

function throwItemDbError(errors: ItemErrorFactories, error: unknown): never {
  if (error instanceof ItemDbError) {
    throw errors[error.code]({ data: { code: error.code } });
  }

  throw error;
}
