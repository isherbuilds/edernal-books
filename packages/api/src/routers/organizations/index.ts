import {
  GetOrganizationSettingInputSchema,
  OrganizationSettingSchema,
  type OrganizationSetting,
  UpsertOrganizationSettingOutputSchema,
  UpsertOrganizationSettingInputSchema
} from "@tsu-stack/core/organizations";
import {
  getOrganizationSetting,
  logOrganizationSettingAudit,
  type OrganizationSettingRow,
  upsertOrganizationSetting
} from "@tsu-stack/db/queries";

import { organizationProcedure } from "#@/lib/procedures/factory";

export const organizationsRouter = {
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
    upsert: organizationProcedure(UpsertOrganizationSettingInputSchema)
      .route({
        description: "Create or update settings for the request organization",
        method: "PUT"
      })
      .output(UpsertOrganizationSettingOutputSchema)
      .handler(async ({ context, input }) => {
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

        await upsertOrganizationSetting(context.db, settingInput);

        logOrganizationSettingAudit(context.db, {
          ...settingInput,
          source: "user",
          userId: context.authSession.user.id
        });

        return {
          ok: true,
          organizationId: context.organizationId
        };
      })
  }
};

function toOrganizationSettingOutput(row: OrganizationSettingRow): OrganizationSetting {
  return {
    baseCurrencyCode: row.baseCurrencyCode,
    booksStartDate: row.booksStartDate,
    countryCode: row.countryCode,
    createdAt: row.createdAt.toISOString(),
    fiscalYearStartMonth: row.fiscalYearStartMonth,
    legalName: row.legalName,
    organizationId: row.organizationId,
    primaryEmail: row.primaryEmail,
    primaryPhone: row.primaryPhone,
    timezone: row.timezone,
    tradeName: row.tradeName,
    updatedAt: row.updatedAt.toISOString()
  };
}
