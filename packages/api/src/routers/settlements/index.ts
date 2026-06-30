import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreateAndPostSettlementInputSchema,
  CreateSettlementDraftInputSchema,
  GetSettlementInputSchema,
  ListAllocationTargetsInputSchema,
  ListAllocationTargetsOutputSchema,
  ListDocumentsOutputSchema,
  ListSettlementsInputSchema,
  PostedDocumentSchema,
  SettlementDocumentSchema,
  UpdateSettlementDraftInputSchema,
  VoidedDocumentSchema,
  VoidSettlementInputSchema
} from "@tsu-stack/core/documents";
import {
  createAndPostSettlement,
  createSettlementDraft,
  getSettlementDocument,
  listAllocationTargets,
  listSettlementDocuments,
  updateAndPostSettlement,
  updateSettlementDraft,
  voidSettlementDocument
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

export const settlementsRouter = {
  list: organizationPermissionProcedure(ListSettlementsInputSchema, canAccessAccounting)
    .route({
      description: "List receipts and payments for the settlement register",
      method: "GET"
    })
    .output(ListDocumentsOutputSchema)
    .handler(({ context, input }) =>
      listSettlementDocuments(context.db, {
        cursor: input.cursor,
        direction: input.direction,
        limit: input.limit,
        organizationId: context.organizationId,
        status: input.status
      })
    ),
  get: organizationPermissionProcedure(GetSettlementInputSchema, canAccessAccounting)
    .route({
      description: "Get one receipt or payment",
      method: "GET"
    })
    .output(SettlementDocumentSchema)
    .handler(({ context, input }) =>
      getSettlementDocument(context.db, {
        documentId: input.documentId,
        organizationId: context.organizationId
      })
    ),
  listAllocationTargets: organizationPermissionProcedure(
    ListAllocationTargetsInputSchema,
    canAccessAccounting
  )
    .route({
      description: "List a party's open documents a settlement can allocate against",
      method: "GET"
    })
    .output(ListAllocationTargetsOutputSchema)
    .handler(({ context, input }) =>
      listAllocationTargets(context.db, {
        cursor: input.cursor,
        direction: input.direction,
        limit: input.limit,
        organizationId: context.organizationId,
        partyId: input.partyId
      })
    ),
  createDraft: organizationPermissionProcedure(
    CreateSettlementDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create a draft receipt or payment settlement",
      method: "POST"
    })
    .output(SettlementDocumentSchema)
    .handler(({ context, input }) =>
      createSettlementDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  createAndPost: organizationPermissionProcedure(
    CreateAndPostSettlementInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create and post a receipt or payment atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      createAndPostSettlement(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateDraft: organizationPermissionProcedure(
    UpdateSettlementDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update an unposted receipt or payment draft",
      method: "POST"
    })
    .output(SettlementDocumentSchema)
    .handler(({ context, input }) =>
      updateSettlementDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateAndPost: organizationPermissionProcedure(
    UpdateSettlementDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update and post a receipt or payment atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      updateAndPostSettlement(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  void: organizationPermissionProcedure(VoidSettlementInputSchema, canAccessAccounting)
    .route({
      description: "Void a posted receipt or payment through a journal reversal",
      method: "POST"
    })
    .output(VoidedDocumentSchema)
    .handler(({ context, input }) =>
      voidSettlementDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    )
};
