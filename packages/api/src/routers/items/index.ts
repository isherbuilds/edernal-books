import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreateItemInputSchema,
  ItemSchema,
  ListItemsInputSchema,
  ListItemsOutputSchema,
  SetItemActiveInputSchema,
  UpdateItemInputSchema
} from "@tsu-stack/core/items";
import {
  createItem,
  listItems,
  OwnerRecordDbError,
  setItemActive,
  updateItem
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

const itemErrorDataSchema = z.object({
  code: z.enum([
    "ITEM_ACCOUNT_ORGANIZATION_MISMATCH",
    "ITEM_NOT_FOUND",
    "OWNER_RECORD_DUPLICATE_NAME"
  ])
});

const itemErrors = {
  ITEM_ACCOUNT_ORGANIZATION_MISMATCH: {
    data: itemErrorDataSchema,
    status: 422
  },
  ITEM_NOT_FOUND: {
    data: itemErrorDataSchema,
    status: 404
  },
  OWNER_RECORD_DUPLICATE_NAME: {
    data: itemErrorDataSchema,
    status: 409
  }
};

type ItemErrorFactories = {
  ITEM_ACCOUNT_ORGANIZATION_MISMATCH: (input: {
    data: { code: "ITEM_ACCOUNT_ORGANIZATION_MISMATCH" };
  }) => unknown;
  ITEM_NOT_FOUND: (input: { data: { code: "ITEM_NOT_FOUND" } }) => unknown;
  OWNER_RECORD_DUPLICATE_NAME: (input: {
    data: { code: "OWNER_RECORD_DUPLICATE_NAME" };
  }) => unknown;
};

export const itemsRouter = {
  list: organizationPermissionProcedure(ListItemsInputSchema, canAccessAccounting)
    .route({
      description: "List organization goods and services",
      method: "GET"
    })
    .output(ListItemsOutputSchema)
    .handler(async ({ context, input }) => {
      const items = await listItems(context.db, {
        includeInactive: input.includeInactive,
        kind: input.kind,
        organizationId: context.organizationId,
        q: input.q,
        usage: input.usage
      });

      return { items };
    }),
  create: organizationPermissionProcedure(CreateItemInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization good or service",
      method: "POST"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) =>
      catchItemDbError(errors, () =>
        createItem(context.db, {
          ...input,
          organizationId: context.organizationId
        })
      )
    ),
  update: organizationPermissionProcedure(UpdateItemInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization good or service",
      method: "PUT"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) =>
      catchItemDbError(errors, () =>
        updateItem(context.db, {
          ...input,
          organizationId: context.organizationId
        })
      )
    ),
  setActive: organizationPermissionProcedure(SetItemActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization good or service",
      method: "PUT"
    })
    .errors(itemErrors)
    .output(ItemSchema)
    .handler(async ({ context, errors, input }) =>
      catchItemDbError(errors, () =>
        setItemActive(context.db, {
          id: input.id,
          isActive: input.isActive,
          organizationId: context.organizationId
        })
      )
    )
};

async function catchItemDbError<T>(
  errors: ItemErrorFactories,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof OwnerRecordDbError) {
      if (error.code === "ITEM_ACCOUNT_ORGANIZATION_MISMATCH") {
        throw errors.ITEM_ACCOUNT_ORGANIZATION_MISMATCH({
          data: { code: "ITEM_ACCOUNT_ORGANIZATION_MISMATCH" }
        });
      }

      if (error.code === "ITEM_NOT_FOUND") {
        throw errors.ITEM_NOT_FOUND({ data: { code: "ITEM_NOT_FOUND" } });
      }

      if (error.code === "OWNER_RECORD_DUPLICATE_NAME") {
        throw errors.OWNER_RECORD_DUPLICATE_NAME({
          data: { code: "OWNER_RECORD_DUPLICATE_NAME" }
        });
      }
    }

    throw error;
  }
}
