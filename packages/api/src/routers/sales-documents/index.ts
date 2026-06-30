import { canAccessAccounting } from "@tsu-stack/auth/permissions";
import {
  CreateAndPostSalesDocumentInputSchema,
  CreateSalesDocumentDraftInputSchema,
  GetSalesDocumentInputSchema,
  ListDocumentsOutputSchema,
  ListSalesDocumentsInputSchema,
  PostedDocumentSchema,
  SalesDocumentSchema,
  UpdateSalesDocumentDraftInputSchema,
  VoidedDocumentSchema,
  VoidSalesDocumentInputSchema
} from "@tsu-stack/core/documents";
import {
  createAndPostSalesDocument,
  createSalesDocumentDraft,
  getSalesDocument,
  listSalesDocuments,
  updateAndPostSalesDocument,
  updateSalesDocumentDraft,
  voidSalesDocument
} from "@tsu-stack/db/queries";

import { organizationPermissionProcedure } from "#@/lib/procedures/factory";

export const salesDocumentsRouter = {
  list: organizationPermissionProcedure(ListSalesDocumentsInputSchema, canAccessAccounting)
    .route({
      description: "List sales invoices for the sales register",
      method: "GET"
    })
    .output(ListDocumentsOutputSchema)
    .handler(({ context, input }) =>
      listSalesDocuments(context.db, {
        cursor: input.cursor,
        limit: input.limit,
        organizationId: context.organizationId,
        status: input.status
      })
    ),
  get: organizationPermissionProcedure(GetSalesDocumentInputSchema, canAccessAccounting)
    .route({
      description: "Get one sales invoice",
      method: "GET"
    })
    .output(SalesDocumentSchema)
    .handler(({ context, input }) =>
      getSalesDocument(context.db, {
        documentId: input.documentId,
        organizationId: context.organizationId
      })
    ),
  createDraft: organizationPermissionProcedure(
    CreateSalesDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create a draft sales invoice without allocating an official invoice number",
      method: "POST"
    })
    .output(SalesDocumentSchema)
    .handler(({ context, input }) =>
      createSalesDocumentDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  createAndPost: organizationPermissionProcedure(
    CreateAndPostSalesDocumentInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Create and post a sales invoice atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      createAndPostSalesDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateDraft: organizationPermissionProcedure(
    UpdateSalesDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update an unposted sales invoice draft",
      method: "POST"
    })
    .output(SalesDocumentSchema)
    .handler(({ context, input }) =>
      updateSalesDocumentDraft(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  updateAndPost: organizationPermissionProcedure(
    UpdateSalesDocumentDraftInputSchema,
    canAccessAccounting
  )
    .route({
      description: "Update and post a sales invoice atomically",
      method: "POST"
    })
    .output(PostedDocumentSchema)
    .handler(({ context, input }) =>
      updateAndPostSalesDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    ),
  void: organizationPermissionProcedure(VoidSalesDocumentInputSchema, canAccessAccounting)
    .route({
      description: "Void a posted sales invoice through a journal reversal",
      method: "POST"
    })
    .output(VoidedDocumentSchema)
    .handler(({ context, input }) =>
      voidSalesDocument(context.db, {
        ...input,
        organizationId: context.organizationId,
        userId: context.authSession.user.id
      })
    )
};
