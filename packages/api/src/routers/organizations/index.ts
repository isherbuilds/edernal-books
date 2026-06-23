import { z } from "zod";

import { canManageBusinessSettings } from "@tsu-stack/auth/permissions";
import {
  GetOrganizationSettingInputSchema,
  OrganizationSettingSchema,
  type OrganizationSetting,
  type UpsertOrganizationSettingInput,
  UpsertOrganizationSettingOutputSchema,
  UpsertOrganizationSettingInputSchema
} from "@tsu-stack/core/organizations";
import {
  getOrganizationSetting,
  listOrganizationsForUser,
  logOrganizationSettingAudit,
  markOrganizationOnboardingCompleted,
  type OrganizationListItem,
  type OrganizationSettingRow,
  upsertOrganizationSetting
} from "@tsu-stack/db/queries";

import {
  organizationPermissionProcedure,
  organizationProcedure,
  protectedProcedure
} from "#@/lib/procedures/factory";

const ListOrganizationsOutputSchema = z.array(
  z
    .object({
      id: z.string().min(1),
      name: z.string().trim().min(1),
      onboardingCompletedAt: z.iso.datetime().nullable(),
      role: z.string().trim().min(1),
      slug: z.string().trim().min(1)
    })
    .strict()
);
const CompleteOrganizationOnboardingOutputSchema = z
  .object({
    ok: z.literal(true),
    onboardingCompletedAt: z.iso.datetime(),
    organizationId: z.string().min(1)
  })
  .strict();

export const organizationsRouter = {
  completeOnboarding: organizationPermissionProcedure(
    UpsertOrganizationSettingInputSchema,
    canManageBusinessSettings
  )
    .route({
      description: "Complete onboarding for the request organization",
      method: "POST"
    })
    .output(CompleteOrganizationOnboardingOutputSchema)
    .handler(async ({ context, input }) => {
      const requestedCompletedAt = new Date();
      const settingInput = toOrganizationSettingMutationInput(input, context.organizationId);

      const completedAt = await context.db.transaction(async (tx) => {
        await upsertOrganizationSetting(tx, settingInput);

        const completedAt = await markOrganizationOnboardingCompleted(tx, {
          completedAt: requestedCompletedAt,
          organizationId: context.organizationId
        });

        await logOrganizationSettingAudit(tx, {
          ...settingInput,
          source: "user",
          userId: context.authSession.user.id
        });

        return completedAt;
      });

      return {
        ok: true,
        onboardingCompletedAt: completedAt.toISOString(),
        organizationId: context.organizationId
      };
    }),
  list: protectedProcedure
    .route({
      description: "List organizations available to the current user",
      method: "GET"
    })
    .output(ListOrganizationsOutputSchema)
    .handler(async ({ context }) => {
      const organizations = await listOrganizationsForUser(context.db, {
        userId: context.authSession.user.id
      });

      return organizations.map(toOrganizationListItemOutput);
    }),
  settings: {
    get: organizationProcedure(GetOrganizationSettingInputSchema)
      .route({
        description: "Get settings for the request organization",
        method: "GET"
      })
      .output(OrganizationSettingSchema.nullable())
      .handler(async ({ context }) => {
        const setting = await getOrganizationSetting(context.db, {
          organizationId: context.organizationId
        });

        return setting ? toOrganizationSettingOutput(setting) : null;
      }),
    upsert: organizationPermissionProcedure(
      UpsertOrganizationSettingInputSchema,
      canManageBusinessSettings
    )
      .route({
        description: "Create or update settings for the request organization",
        method: "PUT"
      })
      .output(UpsertOrganizationSettingOutputSchema)
      .handler(async ({ context, input }) => {
        const settingInput = toOrganizationSettingMutationInput(input, context.organizationId);

        await context.db.transaction(async (tx) => {
          await upsertOrganizationSetting(tx, settingInput);
          await logOrganizationSettingAudit(tx, {
            ...settingInput,
            source: "user",
            userId: context.authSession.user.id
          });
        });

        return {
          ok: true,
          organizationId: context.organizationId
        };
      })
  }
};

function toOrganizationListItemOutput(row: OrganizationListItem) {
  return {
    ...row,
    onboardingCompletedAt: row.onboardingCompletedAt?.toISOString() ?? null
  };
}

function toOrganizationSettingMutationInput(
  input: UpsertOrganizationSettingInput,
  organizationId: string
) {
  return {
    baseCurrencyCode: input.baseCurrencyCode,
    booksStartDate: input.booksStartDate,
    countryCode: input.countryCode,
    fiscalYearStartMonth: input.fiscalYearStartMonth,
    legalName: input.legalName,
    organizationId,
    primaryEmail: input.primaryEmail,
    primaryPhone: input.primaryPhone,
    timezone: input.timezone,
    tradeName: input.tradeName
  };
}

function toOrganizationSettingOutput(row: OrganizationSettingRow): OrganizationSetting {
  return OrganizationSettingSchema.parse({
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString()
  });
}
