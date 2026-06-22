import { describe, expect, it } from "vite-plus/test";

import {
  buildOrganizationSettingAuditRow,
  toOrganizationSettingInsert
} from "#@/queries/organization-settings";

describe("organization settings query helpers", () => {
  it("normalizes nullable settings write columns", () => {
    const values = toOrganizationSettingInsert({
      baseCurrencyCode: "INR",
      booksStartDate: "2026-04-01",
      countryCode: "IN",
      fiscalYearStartMonth: 4,
      legalName: "Edernal Books",
      organizationId: "org_1",
      timezone: "Asia/Kolkata"
    });

    expect(values).toMatchObject({
      baseCurrencyCode: "INR",
      booksStartDate: "2026-04-01",
      countryCode: "IN",
      fiscalYearStartMonth: 4,
      legalName: "Edernal Books",
      organizationId: "org_1",
      primaryEmail: null,
      primaryPhone: null,
      timezone: "Asia/Kolkata",
      tradeName: null
    });
  });

  it("builds user audit rows for settings upserts", () => {
    const row = buildOrganizationSettingAuditRow({
      baseCurrencyCode: "INR",
      booksStartDate: "2026-04-01",
      countryCode: "IN",
      fiscalYearStartMonth: 4,
      legalName: "Edernal Books",
      organizationId: "org_1",
      source: "user",
      timezone: "Asia/Kolkata",
      userId: "user_1"
    });

    expect(row).toMatchObject({
      action: "organization_setting.upserted",
      entityId: "org_1",
      entityType: "organization_setting",
      organizationId: "org_1",
      scopeId: "org_1",
      scopeType: "organization",
      userId: "user_1"
    });
    expect(row.payloadJson).toMatchObject({
      metadata: {
        source: "user"
      }
    });
  });
});
