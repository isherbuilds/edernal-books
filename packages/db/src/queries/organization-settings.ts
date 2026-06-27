import { eq } from "drizzle-orm";

import {
  type CountryCode,
  type CurrencyCode,
  type FiscalYearStartMonth,
  type Timezone
} from "@tsu-stack/core/organizations";

import { type DatabaseOrTransaction } from "#@/client";
import { auditEvent } from "#@/schema/audit";
import { organizationSetting } from "#@/schema/organization";
import { fiscalYear } from "#@/schema/periods";

export type OrganizationSettingRow = typeof organizationSetting.$inferSelect;
type OrganizationSettingInsert = typeof organizationSetting.$inferInsert;

export type GetOrganizationSettingQueryInput = {
  organizationId: string;
};

export type OrganizationSettingMutationInput = {
  baseCurrencyCode: CurrencyCode;
  booksStartDate: string;
  countryCode: CountryCode;
  fiscalYearStartMonth: FiscalYearStartMonth;
  legalName: string;
  organizationId: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  timezone: Timezone;
  tradeName?: string | null;
};

export type OrganizationSettingAuditSource = "user" | "system" | "api";

export type OrganizationSettingAuditInput = OrganizationSettingMutationInput & {
  source?: OrganizationSettingAuditSource;
  userId: string;
};
export type OrganizationSettingAuditRow = typeof auditEvent.$inferInsert;

export class OrganizationSettingDbError extends Error {
  code: "ACCOUNTING_FOUNDATION_SETTINGS_LOCKED";

  constructor(code: "ACCOUNTING_FOUNDATION_SETTINGS_LOCKED") {
    super(code);
    this.code = code;
  }
}

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
  const [existing] = await dbOrTx
    .select({
      baseCurrencyCode: organizationSetting.baseCurrencyCode,
      booksStartDate: organizationSetting.booksStartDate,
      fiscalYearStartMonth: organizationSetting.fiscalYearStartMonth
    })
    .from(organizationSetting)
    .where(eq(organizationSetting.organizationId, input.organizationId))
    .limit(1);

  if (existing && hasAccountingFoundationSettingChange(existing, input)) {
    const [foundation] = await dbOrTx
      .select({ id: fiscalYear.id })
      .from(fiscalYear)
      .where(eq(fiscalYear.organizationId, input.organizationId))
      .limit(1);

    if (foundation) {
      throw new OrganizationSettingDbError("ACCOUNTING_FOUNDATION_SETTINGS_LOCKED");
    }
  }

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

export async function logOrganizationSettingAudit(
  dbOrTx: DatabaseOrTransaction,
  input: OrganizationSettingAuditInput
): Promise<void> {
  await insertOrganizationSettingAudit(dbOrTx, input);
}

export function toOrganizationSettingInsert(
  input: OrganizationSettingMutationInput
): OrganizationSettingInsert {
  return {
    baseCurrencyCode: input.baseCurrencyCode,
    booksStartDate: input.booksStartDate,
    countryCode: input.countryCode,
    fiscalYearStartMonth: input.fiscalYearStartMonth,
    legalName: input.legalName,
    organizationId: input.organizationId,
    primaryEmail: input.primaryEmail ?? null,
    primaryPhone: input.primaryPhone ?? null,
    timezone: input.timezone,
    tradeName: input.tradeName ?? null
  };
}

export function hasAccountingFoundationSettingChange(
  existing: Pick<
    OrganizationSettingRow,
    "baseCurrencyCode" | "booksStartDate" | "fiscalYearStartMonth"
  >,
  input: Pick<
    OrganizationSettingMutationInput,
    "baseCurrencyCode" | "booksStartDate" | "fiscalYearStartMonth"
  >
): boolean {
  return (
    existing.baseCurrencyCode !== input.baseCurrencyCode ||
    existing.booksStartDate !== input.booksStartDate ||
    existing.fiscalYearStartMonth !== input.fiscalYearStartMonth
  );
}

export function buildOrganizationSettingAuditRow(
  input: OrganizationSettingAuditInput
): OrganizationSettingAuditRow {
  const values = toOrganizationSettingInsert(input);

  return {
    action: "organization_setting.upserted",
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
  };
}

async function insertOrganizationSettingAudit(
  dbOrTx: DatabaseOrTransaction,
  input: OrganizationSettingAuditInput
): Promise<void> {
  await dbOrTx.insert(auditEvent).values(buildOrganizationSettingAuditRow(input));
}
