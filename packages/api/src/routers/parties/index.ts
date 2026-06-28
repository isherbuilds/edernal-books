import { z } from "zod";

import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreatePartyInputSchema,
  GetPartyInputSchema,
  ListPartiesInputSchema,
  ListPartiesOutputSchema,
  PartyErrorCodeSchema,
  PartySchema,
  SetPartyActiveInputSchema,
  UpdatePartyInputSchema
} from "@tsu-stack/core/parties";
import {
  createParty,
  getParty,
  listParties,
  PartyDbError,
  setPartyActive,
  updateParty
} from "@tsu-stack/db/queries";

import { throwMappedDbError } from "#@/lib/db-error";
import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

const partyErrorDataSchema = z.object({
  code: PartyErrorCodeSchema
});
const partyErrors = {
  PARTY_CURSOR_INVALID: { data: partyErrorDataSchema, status: 400 },
  PARTY_DUPLICATE_NAME: { data: partyErrorDataSchema, status: 409 },
  PARTY_NOT_FOUND: { data: partyErrorDataSchema, status: 404 }
} as const;

export const partiesRouter = {
  list: organizationPermissionProcedure(ListPartiesInputSchema, canAccessAccounting)
    .route({
      description: "List organization customers and vendors",
      method: "GET"
    })
    .errors(partyErrors)
    .output(ListPartiesOutputSchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await listParties(context.db, {
          cursor: input.cursor,
          includeInactive: input.includeInactive,
          kind: input.kind,
          limit: input.limit,
          organizationId: context.organizationId,
          q: input.q
        });
      } catch (error) {
        throwMappedDbError(errors, error, PartyDbError);
      }
    }),
  get: organizationPermissionProcedure(GetPartyInputSchema, canAccessAccounting)
    .route({
      description: "Get an organization customer or vendor",
      method: "GET"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await getParty(context.db, {
          id: input.id,
          organizationId: context.organizationId
        });
      } catch (error) {
        throwMappedDbError(errors, error, PartyDbError);
      }
    }),
  create: organizationPermissionProcedure(CreatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization customer or vendor",
      method: "POST"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await createParty(context.db, {
          ...input,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwMappedDbError(errors, error, PartyDbError);
      }
    }),
  update: organizationPermissionProcedure(UpdatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization customer or vendor",
      method: "PUT"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await updateParty(context.db, {
          ...input,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwMappedDbError(errors, error, PartyDbError);
      }
    }),
  setActive: organizationPermissionProcedure(SetPartyActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization customer or vendor",
      method: "PUT"
    })
    .errors(partyErrors)
    .output(PartySchema)
    .handler(async ({ context, errors, input }) => {
      try {
        return await setPartyActive(context.db, {
          id: input.id,
          isActive: input.isActive,
          organizationId: context.organizationId,
          userId: context.authSession.user.id
        });
      } catch (error) {
        throwMappedDbError(errors, error, PartyDbError);
      }
    })
};
