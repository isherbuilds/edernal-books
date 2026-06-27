import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreatePartyInputSchema,
  ListPartiesInputSchema,
  ListPartiesOutputSchema,
  PartySchema,
  SetPartyActiveInputSchema,
  UpdatePartyInputSchema
} from "@tsu-stack/core/parties";
import {
  createParty,
  listParties,
  OwnerRecordDbError,
  setPartyActive,
  updateParty
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

const partyErrorDataSchema = z.object({
  code: z.enum(["OWNER_RECORD_DUPLICATE_NAME", "PARTY_NOT_FOUND"])
});

const partyErrors = {
  OWNER_RECORD_DUPLICATE_NAME: {
    data: partyErrorDataSchema,
    status: 409
  },
  PARTY_NOT_FOUND: {
    data: partyErrorDataSchema,
    status: 404
  }
};

type PartyErrorFactories = {
  OWNER_RECORD_DUPLICATE_NAME: (input: {
    data: { code: "OWNER_RECORD_DUPLICATE_NAME" };
  }) => unknown;
  PARTY_NOT_FOUND: (input: { data: { code: "PARTY_NOT_FOUND" } }) => unknown;
};

export const partiesRouter = {
  list: organizationPermissionProcedure(ListPartiesInputSchema, canAccessAccounting)
    .route({
      description: "List organization customers and vendors",
      method: "GET"
    })
    .output(ListPartiesOutputSchema)
    .handler(async ({ context, input }) => {
      const parties = await listParties(context.db, {
        includeInactive: input.includeInactive,
        kind: input.kind,
        organizationId: context.organizationId,
        q: input.q
      });

      return { parties };
    }),
  create: organizationPermissionProcedure(CreatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization customer or vendor",
      method: "POST"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) =>
      catchPartyDbError(errors, () =>
        createParty(context.db, {
          ...input,
          organizationId: context.organizationId
        })
      )
    ),
  update: organizationPermissionProcedure(UpdatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization customer or vendor",
      method: "PUT"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) =>
      catchPartyDbError(errors, () =>
        updateParty(context.db, {
          ...input,
          organizationId: context.organizationId
        })
      )
    ),
  setActive: organizationPermissionProcedure(SetPartyActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization customer or vendor",
      method: "PUT"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) =>
      catchPartyDbError(errors, () =>
        setPartyActive(context.db, {
          id: input.id,
          isActive: input.isActive,
          organizationId: context.organizationId
        })
      )
    )
};

async function catchPartyDbError<T>(
  errors: PartyErrorFactories,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof OwnerRecordDbError) {
      if (error.code === "PARTY_NOT_FOUND") {
        throw errors.PARTY_NOT_FOUND({ data: { code: "PARTY_NOT_FOUND" } });
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
