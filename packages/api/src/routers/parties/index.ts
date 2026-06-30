import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreatePartyInputSchema,
  GetPartyInputSchema,
  ListPartiesInputSchema,
  ListPartiesOutputSchema,
  PartySchema,
  SetPartyActiveInputSchema,
  UpdatePartyInputSchema
} from "@tsu-stack/core/parties";
import { createParty, getParty, listParties, updateParty } from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

export const partiesRouter = {
  list: organizationPermissionProcedure(ListPartiesInputSchema, canAccessAccounting)
    .route({
      description: "List organization customers and vendors",
      method: "GET"
    })
    .output(ListPartiesOutputSchema)
    .handler(({ context, input }) =>
      listParties(context.db, {
        cursor: input.cursor,
        includeInactive: input.includeInactive,
        kind: input.kind,
        limit: input.limit,
        organizationId: context.organizationId,
        q: input.q
      })
    ),
  get: organizationPermissionProcedure(GetPartyInputSchema, canAccessAccounting)
    .route({
      description: "Get an organization customer or vendor",
      method: "GET"
    })
    .output(PartySchema)
    .handler(({ context, input }) =>
      getParty(context.db, {
        id: input.id,
        organizationId: context.organizationId
      })
    ),
  create: organizationPermissionProcedure(CreatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Create an organization customer or vendor",
      method: "POST"
    })
    .output(PartySchema)
    .handler(({ context, input }) =>
      createParty(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  update: organizationPermissionProcedure(UpdatePartyInputSchema, canAccessAccounting)
    .route({
      description: "Update an organization customer or vendor",
      method: "PUT"
    })
    .output(PartySchema)
    .handler(({ context, input }) =>
      updateParty(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  setActive: organizationPermissionProcedure(SetPartyActiveInputSchema, canAccessAccounting)
    .route({
      description: "Activate or deactivate an organization customer or vendor",
      method: "PUT"
    })
    .output(PartySchema)
    .handler(({ context, input }) =>
      updateParty(context.db, {
        id: input.id,
        isActive: input.isActive,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    )
};
