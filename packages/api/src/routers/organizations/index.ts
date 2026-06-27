import { z } from "zod";

import { canManageBusinessSettings } from "@tsu-stack/auth/permissions";
import { getFiscalYearStartMonthFromEndDate } from "@tsu-stack/core/accounting";
import {
  CompleteOrganizationOnboardingInputSchema,
  GetOrganizationSettingInputSchema,
  OrganizationSettingSchema,
  UpsertOrganizationSettingOutputSchema,
  UpsertOrganizationSettingInputSchema
} from "@tsu-stack/core/organizations";
import {
  getOrganizationSetting,
  listOrganizationsForUser,
  logOrganizationSettingAudit,
  markOrganizationOnboardingCompleted,
  OrganizationSettingDbError,
  setupOrganizationAccountingDefaults,
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
const organizationSettingErrorDataSchema = z.object({
  code: z.literal("ACCOUNTING_FOUNDATION_SETTINGS_LOCKED")
});
const organizationSettingErrors = {
  ACCOUNTING_FOUNDATION_SETTINGS_LOCKED: {
    data: organizationSettingErrorDataSchema,
    status: 409
  }
};

type OrganizationSettingErrorFactories = {
  ACCOUNTING_FOUNDATION_SETTINGS_LOCKED: (input: {
    data: { code: "ACCOUNTING_FOUNDATION_SETTINGS_LOCKED" };
  }) => unknown;
};

export const organizationsRouter = {
  completeOnboarding: organizationPermissionProcedure(
    CompleteOrganizationOnboardingInputSchema,
    canManageBusinessSettings
  )
    .route({
      description: "Complete onboarding for the request organization",
      method: "POST"
    })
    .errors(organizationSettingErrors)
    .output(CompleteOrganizationOnboardingOutputSchema)
    .handler(async ({ context, errors, input }) => {
      const requestedCompletedAt = new Date();
      const settingInput = {
        baseCurrencyCode: input.baseCurrencyCode,
        booksStartDate: input.booksStartDate,
        countryCode: input.countryCode,
        fiscalYearStartMonth: getFiscalYearStartMonthFromEndDate(input.initialFiscalYearEndDate),
        legalName: input.legalName,
        organizationId: context.organizationId,
        primaryEmail: input.primaryEmail,
        primaryPhone: input.primaryPhone,
        timezone: input.timezone,
        tradeName: input.tradeName
      };

      const completedAt = await catchOrganizationSettingDbError(errors, () =>
        context.db.transaction(async (tx) => {
          const completion = await markOrganizationOnboardingCompleted(tx, {
            completedAt: requestedCompletedAt,
            organizationId: context.organizationId
          });

          if (completion.alreadyCompleted) {
            return completion.completedAt;
          }

          await upsertOrganizationSetting(tx, settingInput);
          await setupOrganizationAccountingDefaults(tx, {
            booksStartDate: settingInput.booksStartDate,
            initialFiscalYearEndDate: input.initialFiscalYearEndDate,
            organizationId: context.organizationId,
            userId: context.authSession.user.id
          });

          await logOrganizationSettingAudit(tx, {
            ...settingInput,
            source: "user",
            userId: context.authSession.user.id
          });

          return completion.completedAt;
        })
      );

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

      return organizations.map((organization) => {
        return {
          ...organization,
          onboardingCompletedAt: organization.onboardingCompletedAt?.toISOString() ?? null
        };
      });
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

        if (!setting) {
          return null;
        }

        return {
          ...setting,
          createdAt: setting.createdAt.toISOString(),
          updatedAt: setting.updatedAt.toISOString()
        };
      }),
    upsert: organizationPermissionProcedure(
      UpsertOrganizationSettingInputSchema,
      canManageBusinessSettings
    )
      .route({
        description: "Create or update settings for the request organization",
        method: "PUT"
      })
      .errors(organizationSettingErrors)
      .output(UpsertOrganizationSettingOutputSchema)
      .handler(async ({ context, errors, input }) => {
        const settingInput = {
          baseCurrencyCode: input.baseCurrencyCode,
          booksStartDate: input.booksStartDate,
          countryCode: input.countryCode,
          fiscalYearStartMonth: input.fiscalYearStartMonth,
          legalName: input.legalName,
          organizationId: context.organizationId,
          primaryEmail: input.primaryEmail,
          primaryPhone: input.primaryPhone,
          timezone: input.timezone,
          tradeName: input.tradeName
        };

        await catchOrganizationSettingDbError(errors, () =>
          context.db.transaction(async (tx) => {
            await upsertOrganizationSetting(tx, settingInput);
            await logOrganizationSettingAudit(tx, {
              ...settingInput,
              source: "user",
              userId: context.authSession.user.id
            });
          })
        );

        return {
          ok: true,
          organizationId: context.organizationId
        };
      })
  }
};

async function catchOrganizationSettingDbError<T>(
  errors: OrganizationSettingErrorFactories,
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof OrganizationSettingDbError) {
      throw errors.ACCOUNTING_FOUNDATION_SETTINGS_LOCKED({
        data: { code: "ACCOUNTING_FOUNDATION_SETTINGS_LOCKED" }
      });
    }

    throw error;
  }
}
