import { eq } from "drizzle-orm";

import { log } from "@tsu-stack/logger/server";

import { type Database, type DatabaseOrTransaction } from "#@/client";
import { auditEvent } from "#@/schema/audit";
import { organizationSetting } from "#@/schema/organization";

export type OrganizationSettingRow = typeof organizationSetting.$inferSelect;
type OrganizationSettingInsert = typeof organizationSetting.$inferInsert;

export type GetOrganizationSettingQueryInput = {
  organizationId: string;
};

export type OrganizationSettingMutationInput = {
  baseCurrencyCode?: string;
  booksStartDate: string;
  countryCode?: string;
  fiscalYearStartMonth?: number;
  legalName: string;
  organizationId: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  timezone?: string;
  tradeName?: string | null;
};

export type OrganizationSettingActivitySource = "user" | "system" | "api";

export type OrganizationSettingActivityInput = OrganizationSettingMutationInput & {
  source?: OrganizationSettingActivitySource;
  userId: string;
};

export async function getOrganizationSetting(
  dbOrTx: DatabaseOrTransaction,
  input: GetOrganizationSettingQueryInput
): Promise<OrganizationSettingRow | undefined> {
  const [result] = await dbOrTx
    .select()
    .from(organizationSetting)
    .where(eq(organizationSetting.organizationId, input.organizationId))
    .limit(1);

  return result;
}

export async function upsertOrganizationSetting(
  dbOrTx: DatabaseOrTransaction,
  input: OrganizationSettingMutationInput
): Promise<void> {
  const values = toOrganizationSettingInsert(input);

  await dbOrTx
    .insert(organizationSetting)
    .values(values)
    .onConflictDoUpdate({
      set: {
        baseCurrencyCode: values.baseCurrencyCode,
        booksStartDate: values.booksStartDate,
        countryCode: values.countryCode,
        fiscalYearStartMonth: values.fiscalYearStartMonth,
        legalName: values.legalName,
        primaryEmail: values.primaryEmail,
        primaryPhone: values.primaryPhone,
        timezone: values.timezone,
        tradeName: values.tradeName,
        updatedAt: new Date()
      },
      target: organizationSetting.organizationId
    });
}

export function logOrganizationSettingActivity(
  db: Database,
  input: OrganizationSettingActivityInput
): void {
  void insertOrganizationSettingActivity(db, input).catch((error) => {
    log.warn({
      error,
      event: "organization_setting_activity_failed",
      organizationId: input.organizationId
    });
  });
}

function toOrganizationSettingInsert(
  input: OrganizationSettingMutationInput
): OrganizationSettingInsert {
  return {
    baseCurrencyCode: input.baseCurrencyCode ?? "INR",
    booksStartDate: input.booksStartDate,
    countryCode: input.countryCode ?? "IN",
    fiscalYearStartMonth: input.fiscalYearStartMonth ?? 4,
    legalName: input.legalName,
    organizationId: input.organizationId,
    primaryEmail: input.primaryEmail ?? null,
    primaryPhone: input.primaryPhone ?? null,
    timezone: input.timezone ?? "Asia/Kolkata",
    tradeName: input.tradeName ?? null
  };
}

async function insertOrganizationSettingActivity(
  db: Database,
  input: OrganizationSettingActivityInput
): Promise<void> {
  const values = toOrganizationSettingInsert(input);

  await db.insert(auditEvent).values({
    action: "organization_setting.saved",
    entityId: input.organizationId,
    entityType: "organization_setting",
    organizationId: input.organizationId,
    payloadJson: {
      after: values,
      metadata: {
        source: input.source ?? "user"
      }
    },
    scopeId: input.organizationId,
    scopeType: "organization",
    userId: input.userId
  });
}
