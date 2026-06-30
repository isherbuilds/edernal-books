import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreateAndPostPurchaseDocumentInputSchema,
  CreatePurchaseDocumentDraftInputSchema,
  GetPurchaseDocumentInputSchema,
  ListDocumentsOutputSchema,
  ListPurchaseDocumentsInputSchema,
  PostedDocumentSchema,
  PurchaseDocumentSchema,
  UpdatePurchaseDocumentDraftInputSchema,
  VoidedDocumentSchema,
  VoidPurchaseDocumentInputSchema
} from "@tsu-stack/core/documents";
import {
  createAndPostPurchaseDocument,
  createPurchaseDocumentDraft,
  getPurchaseDocument,
  listPurchaseDocuments,
  updateAndPostPurchaseDocument,
  updatePurchaseDocumentDraft,
  voidPurchaseDocument
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

export const purchaseDocumentsRouter = {
  list: organizationPermissionProcedure(ListPurchaseDocumentsInputSchema, canAccessAccounting)
    .route({
      description: "List purchase bills and expenses for the purchase register",
      method: "GET"
    })
    .output(ListDocumentsOutputSchema)
    .handler(({ context, input }) =>
      listPurchaseDocuments(context.db, {
        cursor: input.cursor,
        documentKind: input.documentKind,
        limit: input.limit,
        organizationId: context.organizationId,
        status: input.status
      })
    ),
  get: organizationPermissionProcedure(GetPurchaseDocumentInputSchema, canAccessAccounting)
    .route({
      description: "Get one purchase bill or expense",
      method: "GET"
    })
    .output(PurchaseDocumentSchema)
    .handler(({ context, input }) =>
      getPurchaseDocument(context.db, {
        documentId: input.documentId,
        organizationId: context.organizationId
      })
    ),
  createDraft: organizationPermissionProcedure(
    CreatePurchaseDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create a draft purchase bill or expense without allocating an official number",
      method: "POST"
    })
    .output(PurchaseDocumentSchema)
    .handler(({ context, input }) =>
      createPurchaseDocumentDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  createAndPost: organizationPermissionProcedure(
    CreateAndPostPurchaseDocumentInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create and post a purchase bill or expense atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      createAndPostPurchaseDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateDraft: organizationPermissionProcedure(
    UpdatePurchaseDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update an unposted purchase bill or expense draft",
      method: "POST"
    })
    .output(PurchaseDocumentSchema)
    .handler(({ context, input }) =>
      updatePurchaseDocumentDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateAndPost: organizationPermissionProcedure(
    UpdatePurchaseDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update and post a purchase bill or expense atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      updateAndPostPurchaseDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  void: organizationPermissionProcedure(VoidPurchaseDocumentInputSchema, canAccessAccounting)
    .route({
      description: "Void a posted purchase bill or expense through a journal reversal",
      method: "POST"
    })
    .output(VoidedDocumentSchema)
    .handler(({ context, input }) =>
      voidPurchaseDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    )
};
